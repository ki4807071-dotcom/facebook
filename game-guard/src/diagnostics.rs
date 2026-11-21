use crate::{
    config::Config,
    logger::unix_timestamp_secs,
    power_profile::{self, SystemSettingsAudit},
    telemetry::TelemetrySnapshot,
};
use serde::Serialize;
use std::{fs, io, path::Path};

#[derive(Serialize)]
pub struct DiagnosticsReport {
    pub generated_at_unix_secs: u64,
    pub app: &'static str,
    pub dry_run: bool,
    pub monitor_interval_secs: u64,
    pub memory_warning_gib: f64,
    pub telemetry: TelemetrySnapshot,
    pub system_settings: SystemSettingsAudit,
}

pub fn write_report(path: &Path, config: &Config, telemetry: TelemetrySnapshot) -> io::Result<()> {
    let report = DiagnosticsReport {
        generated_at_unix_secs: unix_timestamp_secs(),
        app: "game-guard",
        dry_run: config.dry_run,
        monitor_interval_secs: config.monitor_interval_secs,
        memory_warning_gib: config.memory_warning_gib,
        telemetry,
        system_settings: power_profile::audit_unchanged(),
    };
    fs::write(path, serde_json::to_vec_pretty(&report)?)
}
