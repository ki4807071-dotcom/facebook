use crate::config::{Config, GameConfig, DEFAULT_PROTECTED_PROCESSES};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use sysinfo::System;

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct GameInstance {
    pub pid: u32,
    pub name: String,
    pub exe_name: String,
    pub category: String,
}

#[derive(Clone, Debug, Default)]
pub struct ProcessScan {
    pub active_games: Vec<GameInstance>,
    pub started_games: Vec<GameInstance>,
    pub ended_games: Vec<GameInstance>,
    pub protected_processes_seen: Vec<String>,
}

pub struct ProcessGuard {
    games_by_exe: HashMap<String, GameConfig>,
    protected_processes: HashSet<String>,
    active_games: HashMap<u32, GameInstance>,
}

impl ProcessGuard {
    pub fn new(config: &Config) -> Self {
        let mut games_by_exe = HashMap::new();
        for game in &config.games {
            for exe_name in &game.exe_names {
                games_by_exe.insert(exe_name.to_ascii_lowercase(), game.clone());
            }
        }

        let protected_processes = DEFAULT_PROTECTED_PROCESSES
            .iter()
            .map(|name| (*name).to_string())
            .chain(
                config
                    .protected_processes
                    .iter()
                    .map(|name| name.to_ascii_lowercase()),
            )
            .collect();

        Self {
            games_by_exe,
            protected_processes,
            active_games: HashMap::new(),
        }
    }

    pub fn scan(&mut self, system: &mut System) -> ProcessScan {
        system.refresh_processes();

        let mut current_games = HashMap::new();
        let mut protected_seen = HashSet::new();

        for (pid, process) in system.processes() {
            let exe_name = normalize_exe_name(process.name());
            if self.protected_processes.contains(&exe_name) {
                protected_seen.insert(exe_name);
                continue;
            }

            if let Some(game) = self.games_by_exe.get(&exe_name) {
                current_games.insert(
                    pid.as_u32(),
                    GameInstance {
                        pid: pid.as_u32(),
                        name: game.name.clone(),
                        exe_name,
                        category: game.category.clone(),
                    },
                );
            }
        }

        let mut result = ProcessScan {
            active_games: current_games.values().cloned().collect(),
            started_games: current_games
                .iter()
                .filter(|(pid, _)| !self.active_games.contains_key(pid))
                .map(|(_, game)| game.clone())
                .collect(),
            ended_games: self
                .active_games
                .iter()
                .filter(|(pid, _)| !current_games.contains_key(pid))
                .map(|(_, game)| game.clone())
                .collect(),
            protected_processes_seen: protected_seen.into_iter().collect(),
        };
        result.active_games.sort_by_key(|game| game.pid);
        result.started_games.sort_by_key(|game| game.pid);
        result.ended_games.sort_by_key(|game| game.pid);
        result.protected_processes_seen.sort();
        self.active_games = current_games;
        result
    }

    pub fn optimization_locked(&self) -> bool {
        !self.active_games.is_empty()
    }

    pub fn is_protected_exe(&self, exe_name: &str) -> bool {
        self.protected_processes
            .contains(&normalize_exe_name(exe_name))
    }
}

pub fn normalize_exe_name(name: &str) -> String {
    name.rsplit(|character| character == '\\' || character == '/')
        .next()
        .unwrap_or(name)
        .to_ascii_lowercase()
}

#[cfg(test)]
mod tests {
    use super::{normalize_exe_name, ProcessGuard};
    use crate::config::Config;

    #[test]
    fn normalizes_windows_executable_paths() {
        assert_eq!(normalize_exe_name(r"C:\Games\EXAMPLE.EXE"), "example.exe");
    }

    #[test]
    fn built_in_protected_processes_cannot_be_removed_from_config() {
        let mut config = Config::default();
        config.protected_processes.clear();
        let guard = ProcessGuard::new(&config);

        assert!(guard.is_protected_exe("C:\\Steam\\Steam.exe"));
        assert!(guard.is_protected_exe("vgc.exe"));
        assert!(guard.is_protected_exe("EasyAntiCheat_EOS.exe"));
        assert!(guard.is_protected_exe("BEService.exe"));
    }
}
