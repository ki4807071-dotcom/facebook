mod config;
mod diagnostics;
mod logger;
mod memory;
mod power_profile;
mod process_guard;
mod telemetry;

use config::{Config, GameConfig};
use logger::Logger;
use memory::MemorySnapshot;
use process_guard::{ProcessGuard, ProcessScan};
use std::{
    collections::HashSet,
    env,
    error::Error,
    io,
    path::{Path, PathBuf},
    process::{Command, ExitStatus},
    thread,
    time::Duration,
};
use sysinfo::System;

enum Action {
    Help,
    Watch,
    Launch(PathBuf),
    Report,
}

fn main() {
    if let Err(error) = run() {
        eprintln!("game-guard: {error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn Error>> {
    let action = parse_action()?;
    if matches!(&action, Action::Help) {
        print_usage();
        return Ok(());
    }

    let exe_path = env::current_exe()?;
    let exe_dir = exe_path
        .parent()
        .ok_or_else(|| io::Error::other("Could not locate the executable directory"))?;
    let mut logger = Logger::new(&exe_dir.join("game-guard.log"))?;
    logger.info("Game Guard started")?;

    let config_path = exe_dir.join("config.json");
    let (config, created) = match Config::load_or_create(&config_path) {
        Ok(result) => result,
        Err(error) => {
            let _ = logger.error(&format!("Could not load config.json: {error}"));
            return Err(error);
        }
    };
    if created {
        logger.info("config.json was missing; wrote the default configuration")?;
    }
    logger.info(&format!(
        "dry_run={} (monitor-only mode; no system optimization is implemented)",
        config.dry_run
    ))?;
    if config.games.is_empty() {
        logger.warn("No games are configured; add game entries to config.json")?;
    }

    let mut system = System::new_all();
    let mut process_guard = ProcessGuard::new(&config);

    match action {
        Action::Help => print_usage(),
        Action::Watch => run_watch(&config, &mut system, &mut process_guard, &mut logger)?,
        Action::Launch(path) => run_launch(&config, &path, &mut system, &mut logger)?,
        Action::Report => write_diagnostics(
            &config,
            exe_dir,
            &mut system,
            &mut process_guard,
            &mut logger,
        )?,
    }
    Ok(())
}

fn parse_action() -> Result<Action, io::Error> {
    let args: Vec<String> = env::args().skip(1).collect();
    match args.as_slice() {
        [] => Ok(Action::Help),
        [flag] if flag == "--help" || flag == "-h" => Ok(Action::Help),
        [flag] if flag == "--watch" => Ok(Action::Watch),
        [flag] if flag == "--report" => Ok(Action::Report),
        [flag, path] if flag == "--launch" => Ok(Action::Launch(PathBuf::from(path))),
        _ => Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Usage: game-guard --watch | --launch <game.exe> | --report | --help",
        )),
    }
}

fn print_usage() {
    println!("Game Guard (monitor-only MVP)");
    println!("  game-guard.exe --watch");
    println!("  game-guard.exe --launch \"C:\\Games\\Example\\examplegame.exe\"");
    println!("  game-guard.exe --report");
}

fn run_watch(
    config: &Config,
    system: &mut System,
    process_guard: &mut ProcessGuard,
    logger: &mut Logger,
) -> Result<(), Box<dyn Error>> {
    logger.info("Watch mode started; protected processes will never be modified")?;
    let interval = Duration::from_secs(config.monitor_interval_secs);
    let mut memory_warning_active = false;
    let mut optimization_was_locked = false;
    let mut previous_protected = HashSet::new();

    loop {
        let scan = process_guard.scan(system);
        let memory = MemorySnapshot::capture(system);

        for game in &scan.started_games {
            logger.info(&format!(
                "Game detected: {} ({}, PID {})",
                game.name, game.exe_name, game.pid
            ))?;
        }
        for game in &scan.ended_games {
            logger.info(&format!(
                "Game process ended: {} ({}, PID {})",
                game.name, game.exe_name, game.pid
            ))?;
        }

        for process in &scan.protected_processes_seen {
            if !previous_protected.contains(process) {
                logger.info(&format!(
                    "Protected process detected; no action taken: {process}"
                ))?;
            }
        }
        previous_protected = scan.protected_processes_seen.iter().cloned().collect();

        let optimization_locked = process_guard.optimization_locked();
        if optimization_locked && !optimization_was_locked {
            logger.warn("Game is running; all optimization actions are locked")?;
        } else if !optimization_locked && optimization_was_locked {
            power_profile::log_post_game_confirmation(logger)?;
        }
        optimization_was_locked = optimization_locked;

        if optimization_locked && memory.is_low(config.memory_warning_gib) {
            if !memory_warning_active {
                logger.warn(&format!(
                    "Low RAM while a game is running. {}; no optimization was performed.",
                    memory.summary()
                ))?;
            }
            memory_warning_active = true;
        } else {
            if memory_warning_active && optimization_locked {
                logger.info("RAM availability recovered above the warning threshold")?;
            }
            memory_warning_active = false;
        }

        thread::sleep(interval);
    }
}

fn run_launch(
    config: &Config,
    requested_path: &Path,
    system: &mut System,
    logger: &mut Logger,
) -> Result<(), Box<dyn Error>> {
    if !requested_path.is_absolute() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "--launch requires an absolute path to the game executable",
        )
        .into());
    }
    if !requested_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("exe"))
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "--launch only accepts .exe files",
        )
        .into());
    }
    if !requested_path.is_file() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!(
                "Game executable does not exist: {}",
                requested_path.display()
            ),
        )
        .into());
    }

    let exe_name = requested_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Invalid executable name"))?;
    let normalized_exe = exe_name.to_ascii_lowercase();

    if config
        .protected_processes
        .iter()
        .any(|name| name.eq_ignore_ascii_case(exe_name))
        || process_guard::ProcessGuard::new(config).is_protected_exe(exe_name)
    {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            format!("Refusing to launch protected executable: {exe_name}"),
        )
        .into());
    }

    let game = config
        .games
        .iter()
        .find(|game| {
            game.exe_names
                .iter()
                .any(|configured| configured.eq_ignore_ascii_case(&normalized_exe))
        })
        .cloned()
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::PermissionDenied,
                format!("Executable is not allow-listed in config.json: {exe_name}"),
            )
        })?;

    let memory = MemorySnapshot::capture(system);
    logger.info(&format!(
        "Pre-launch snapshot for {}: {}",
        game.name,
        memory.summary()
    ))?;
    if memory.is_low(config.memory_warning_gib) {
        logger.warn(&format!(
            "Low RAM before launch: {}. Continuing because launch was explicitly requested.",
            memory.summary()
        ))?;
    }

    logger.info(&format!(
        "Launching allow-listed game '{}' from {}",
        game.name,
        requested_path.display()
    ))?;
    let mut child = match Command::new(requested_path).spawn() {
        Ok(child) => child,
        Err(error) => {
            logger.error(&format!(
                "Could not launch {}: {error}",
                requested_path.display()
            ))?;
            return Err(error.into());
        }
    };
    logger.warn(&format!(
        "Game is running (PID {}). All optimization actions are locked.",
        child.id()
    ))?;

    wait_for_game(&mut child, &game, config, system, logger)?;
    power_profile::log_post_game_confirmation(logger)?;
    Ok(())
}

fn wait_for_game(
    child: &mut std::process::Child,
    game: &GameConfig,
    config: &Config,
    system: &mut System,
    logger: &mut Logger,
) -> Result<ExitStatus, Box<dyn Error>> {
    let interval = Duration::from_secs(config.monitor_interval_secs);
    let mut memory_warning_active = false;

    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                logger.info(&format!(
                    "Game '{}' exited with status: {status}",
                    game.name
                ))?;
                return Ok(status);
            }
            Ok(None) => {}
            Err(error) => {
                logger.error(&format!("Could not check game process status: {error}"))?;
                return Err(error.into());
            }
        }

        let memory = MemorySnapshot::capture(system);
        if memory.is_low(config.memory_warning_gib) {
            if !memory_warning_active {
                logger.warn(&format!(
                    "Low RAM while '{}' is running. {}; no optimization was performed.",
                    game.name,
                    memory.summary()
                ))?;
            }
            memory_warning_active = true;
        } else {
            if memory_warning_active {
                logger.info("RAM availability recovered above the warning threshold")?;
            }
            memory_warning_active = false;
        }

        thread::sleep(interval);
    }
}

fn write_diagnostics(
    config: &Config,
    exe_dir: &Path,
    system: &mut System,
    process_guard: &mut ProcessGuard,
    logger: &mut Logger,
) -> Result<(), Box<dyn Error>> {
    let scan: ProcessScan = process_guard.scan(system);
    let memory = MemorySnapshot::capture(system);
    let telemetry =
        telemetry::TelemetrySnapshot::new(memory, &scan, process_guard.optimization_locked());
    let report_path = exe_dir.join("diagnostics.json");
    diagnostics::write_report(&report_path, config, telemetry)?;
    logger.info(&format!(
        "Diagnostics report written to {}",
        report_path.display()
    ))?;
    Ok(())
}
