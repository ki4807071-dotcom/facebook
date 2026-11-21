use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fs, io, path::Path};

pub const DEFAULT_PROTECTED_PROCESSES: &[&str] = &[
    "steam.exe",
    "steamwebhelper.exe",
    "riotclientservices.exe",
    "riotclientux.exe",
    "riotclientuxrender.exe",
    "epicgameslauncher.exe",
    "epicwebhelper.exe",
    "vgc.exe",
    "vgtray.exe",
    "easyanticheat.exe",
    "easyanticheat_eos.exe",
    "start_protected_game.exe",
    "beservice.exe",
    "beservice_x64.exe",
    "battleye.exe",
];

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default)]
pub struct Config {
    pub dry_run: bool,
    pub monitor_interval_secs: u64,
    pub memory_warning_gib: f64,
    pub games: Vec<GameConfig>,
    pub protected_processes: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct GameConfig {
    pub name: String,
    pub exe_names: Vec<String>,
    pub category: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            dry_run: true,
            monitor_interval_secs: 5,
            memory_warning_gib: 2.0,
            games: Vec::new(),
            protected_processes: DEFAULT_PROTECTED_PROCESSES
                .iter()
                .map(|name| (*name).to_string())
                .collect(),
        }
    }
}

impl Config {
    pub fn load_or_create(path: &Path) -> Result<(Self, bool), Box<dyn std::error::Error>> {
        let (config, created) = if path.exists() {
            let contents = fs::read_to_string(path)?;
            (serde_json::from_str::<Self>(&contents)?, false)
        } else {
            let config = Self::default();
            fs::write(path, serde_json::to_vec_pretty(&config)?)?;
            (config, true)
        };

        config
            .validate()
            .map_err(|message| io::Error::new(io::ErrorKind::InvalidData, message))?;
        Ok((config, created))
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.monitor_interval_secs == 0 || self.monitor_interval_secs > 3600 {
            return Err("monitor_interval_secs must be between 1 and 3600".into());
        }
        if !self.memory_warning_gib.is_finite() || self.memory_warning_gib < 0.0 {
            return Err("memory_warning_gib must be a finite non-negative number".into());
        }

        let mut configured_exes = HashSet::new();
        for game in &self.games {
            if game.name.trim().is_empty() {
                return Err("Every game must have a non-empty name".into());
            }
            if game.category.trim().is_empty() {
                return Err(format!("Game '{}' must have a category", game.name));
            }
            if game.exe_names.is_empty() {
                return Err(format!(
                    "Game '{}' must declare at least one exe name",
                    game.name
                ));
            }
            for exe_name in &game.exe_names {
                let normalized = exe_name.to_ascii_lowercase();
                if exe_name.trim() != exe_name
                    || exe_name.contains('\\')
                    || exe_name.contains('/')
                    || !normalized.ends_with(".exe")
                {
                    return Err(format!(
                        "Game executable names must be bare .exe filenames: {exe_name}"
                    ));
                }
                if !configured_exes.insert(normalized) {
                    return Err(format!("Duplicate game executable name: {exe_name}"));
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::{Config, DEFAULT_PROTECTED_PROCESSES};

    #[test]
    fn missing_fields_use_safe_defaults() {
        let config: Config = serde_json::from_str("{}").expect("default config should parse");

        assert!(config.dry_run);
        assert_eq!(config.monitor_interval_secs, 5);
        for required_process in ["steam.exe", "vgc.exe", "easyanticheat.exe", "beservice.exe"] {
            assert!(config
                .protected_processes
                .contains(&required_process.to_string()));
        }
        assert!(!DEFAULT_PROTECTED_PROCESSES.is_empty());
    }

    #[test]
    fn rejects_paths_in_executable_allowlist() {
        let mut config = Config::default();
        config.games.push(super::GameConfig {
            name: "Example".into(),
            exe_names: vec![r"C:\Games\example.exe".into()],
            category: "other".into(),
        });

        assert!(config.validate().is_err());
    }
}
