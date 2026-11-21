use std::{
    fs::{File, OpenOptions},
    io::{self, Write},
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

pub struct Logger {
    file: File,
}

impl Logger {
    pub fn new(path: &Path) -> io::Result<Self> {
        let file = OpenOptions::new().create(true).append(true).open(path)?;
        Ok(Self { file })
    }

    pub fn info(&mut self, message: &str) -> io::Result<()> {
        self.log("INFO", message)
    }

    pub fn warn(&mut self, message: &str) -> io::Result<()> {
        self.log("WARN", message)
    }

    pub fn error(&mut self, message: &str) -> io::Result<()> {
        self.log("ERROR", message)
    }

    fn log(&mut self, level: &str, message: &str) -> io::Result<()> {
        let line = format!("{} [{level}] {message}", unix_timestamp_secs());
        writeln!(self.file, "{line}")?;
        self.file.flush()?;
        println!("{line}");
        Ok(())
    }
}

pub fn unix_timestamp_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
