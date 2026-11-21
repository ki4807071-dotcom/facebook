use serde::Serialize;
use sysinfo::System;

const BYTES_PER_GIB: f64 = 1024.0 * 1024.0 * 1024.0;

#[derive(Clone, Debug, Serialize)]
pub struct MemorySnapshot {
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub used_bytes: u64,
    pub available_gib: f64,
}

impl MemorySnapshot {
    pub fn capture(system: &mut System) -> Self {
        system.refresh_memory();
        let total_bytes = system.total_memory();
        let available_bytes = system.available_memory();

        Self {
            total_bytes,
            available_bytes,
            used_bytes: total_bytes.saturating_sub(available_bytes),
            available_gib: available_bytes as f64 / BYTES_PER_GIB,
        }
    }

    pub fn is_low(&self, warning_threshold_gib: f64) -> bool {
        self.available_gib <= warning_threshold_gib
    }

    pub fn summary(&self) -> String {
        format!(
            "RAM available: {:.2} GiB / {:.2} GiB total",
            self.available_gib,
            self.total_bytes as f64 / BYTES_PER_GIB
        )
    }
}

#[cfg(test)]
mod tests {
    use super::MemorySnapshot;

    #[test]
    fn compares_available_ram_to_warning_threshold() {
        let snapshot = MemorySnapshot {
            total_bytes: 8 * 1024 * 1024 * 1024,
            available_bytes: 1024 * 1024 * 1024,
            used_bytes: 7 * 1024 * 1024 * 1024,
            available_gib: 1.0,
        };

        assert!(snapshot.is_low(1.0));
        assert!(!snapshot.is_low(0.5));
    }
}
