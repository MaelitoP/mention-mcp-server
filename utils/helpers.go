package utils

import (
	"os"
	"path/filepath"
	"time"

	"github.com/sirupsen/logrus"
	"mention-mcp-server/config"
)

type Logger interface {
	Info(msg string, args ...interface{})
	Error(msg string, args ...interface{})
	Debug(msg string, args ...interface{})
	Warn(msg string, args ...interface{})
}

type LogrusLogger struct {
	logger  *logrus.Logger
	debug   bool
	logFile *os.File
}

func NewLogger(debug bool) Logger {
	homeDir, _ := os.UserHomeDir()
	logDir := filepath.Join(homeDir, config.DefaultConfigDir, config.LogsSubDir)
	os.MkdirAll(logDir, 0755)

	logFileName := filepath.Join(logDir, "mcp-"+time.Now().Format(config.LogDateFormat)+".json")
	logFile, err := os.OpenFile(logFileName, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)

	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: time.RFC3339,
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime:  "timestamp",
			logrus.FieldKeyLevel: "level",
			logrus.FieldKeyMsg:   "message",
			logrus.FieldKeyFunc:  "function",
			logrus.FieldKeyFile:  "file",
		},
	})

	if err != nil {
		logger.SetOutput(os.Stderr)
	} else {
		logger.SetOutput(logFile)
	}

	if debug {
		logger.SetLevel(logrus.DebugLevel)
	} else {
		logger.SetLevel(logrus.InfoLevel)
	}

	return &LogrusLogger{
		logger:  logger,
		debug:   debug,
		logFile: logFile,
	}
}

func (l *LogrusLogger) Info(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.logger.Infof(msg, args...)
	} else {
		l.logger.Info(msg)
	}
}

func (l *LogrusLogger) Error(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.logger.Errorf(msg, args...)
	} else {
		l.logger.Error(msg)
	}
}

func (l *LogrusLogger) Debug(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.logger.Debugf(msg, args...)
	} else {
		l.logger.Debug(msg)
	}
}

func (l *LogrusLogger) Warn(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.logger.Warnf(msg, args...)
	} else {
		l.logger.Warn(msg)
	}
}

func ValidateSourceType(source string) bool {
	validSources := []string{
		"web", "news", "blogs", "forums", "twitter", "facebook",
		"instagram", "linkedin", "youtube", "reddit", "pinterest", "tiktok",
	}
	for _, validSource := range validSources {
		if source == validSource {
			return true
		}
	}
	return false
}

func FormatErrorResponse(err error) string {
	if err == nil {
		return "Unknown error occurred"
	}
	return err.Error()
}

func TruncateString(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return string(runes[:maxLen])
	}
	return string(runes[:maxLen-3]) + "..."
}
