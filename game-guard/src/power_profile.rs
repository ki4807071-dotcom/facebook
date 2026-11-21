use crate::logger::Logger;
use serde::Serialize;
use std::io;

#[derive(Clone, Debug, Serialize)]
pub struct SystemSettingsAudit {
    pub settings_changed_by_game_guard: bool,
    pub restore_required: bool,
    pub note: String,
}

pub fn audit_unchanged() -> SystemSettingsAudit {
    SystemSettingsAudit {
        settings_changed_by_game_guard: false,
        restore_required: false,
        note: "Game Guard does not change power plans or other system settings.".into(),
    }
}

pub fn log_post_game_confirmation(logger: &mut Logger) -> io::Result<SystemSettingsAudit> {
    let audit = audit_unchanged();
    logger.info(
        "Post-game restore: no restore needed; Game Guard did not modify any system settings.",
    )?;
    Ok(audit)
}

#[cfg(test)]
mod tests {
    use super::audit_unchanged;

    #[test]
    fn audit_confirms_no_system_changes_need_restoring() {
        let audit = audit_unchanged();

        assert!(!audit.settings_changed_by_game_guard);
        assert!(!audit.restore_required);
    }
}
