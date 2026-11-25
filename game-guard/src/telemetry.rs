use crate::{
    logger::unix_timestamp_secs,
    memory::MemorySnapshot,
    process_guard::{GameInstance, ProcessScan},
};
use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
pub struct TelemetrySnapshot {
    pub captured_at_unix_secs: u64,
    pub memory: MemorySnapshot,
    pub active_games: Vec<GameInstance>,
    pub protected_processes_seen: Vec<String>,
    pub optimization_locked: bool,
}

impl TelemetrySnapshot {
    pub fn new(memory: MemorySnapshot, scan: &ProcessScan, optimization_locked: bool) -> Self {
        Self {
            captured_at_unix_secs: unix_timestamp_secs(),
            memory,
            active_games: scan.active_games.clone(),
            protected_processes_seen: scan.protected_processes_seen.clone(),
            optimization_locked,
        }
    }
}
