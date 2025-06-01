package utils

import (
	"fmt"
	"log"
	"os"
	"time"
)

type Logger interface {
	Info(msg string, args ...interface{})
	Error(msg string, args ...interface{})
	Debug(msg string, args ...interface{})
	Warn(msg string, args ...interface{})
}

type SimpleLogger struct {
	infoLogger  *log.Logger
	errorLogger *log.Logger
	debugLogger *log.Logger
	warnLogger  *log.Logger
	debug       bool
	logFile     *os.File
}

func NewLogger(debug bool) Logger {
	homeDir, _ := os.UserHomeDir()
	logDir := fmt.Sprintf("%s/.config/mention-mcp/logs", homeDir)
	os.MkdirAll(logDir, 0755)

	logFileName := fmt.Sprintf("%s/mcp-debug-%s.log", logDir, time.Now().Format("2006-01-02"))
	logFile, _ := os.OpenFile(logFileName, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)

	return &SimpleLogger{
		infoLogger:  log.New(logFile, "INFO: ", log.Ldate|log.Ltime|log.Lshortfile),
		errorLogger: log.New(logFile, "ERROR: ", log.Ldate|log.Ltime|log.Lshortfile),
		debugLogger: log.New(logFile, "DEBUG: ", log.Ldate|log.Ltime|log.Lshortfile),
		warnLogger:  log.New(logFile, "WARN: ", log.Ldate|log.Ltime|log.Lshortfile),
		debug:       debug,
		logFile:     logFile,
	}
}

func (l *SimpleLogger) Info(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.infoLogger.Printf(msg, args...)
	} else {
		l.infoLogger.Print(msg)
	}
}

func (l *SimpleLogger) Error(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.errorLogger.Printf(msg, args...)
	} else {
		l.errorLogger.Print(msg)
	}
}

func (l *SimpleLogger) Debug(msg string, args ...interface{}) {
	if !l.debug {
		return
	}
	if len(args) > 0 {
		l.debugLogger.Printf(msg, args...)
	} else {
		l.debugLogger.Print(msg)
	}
}

func (l *SimpleLogger) Warn(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.warnLogger.Printf(msg, args...)
	} else {
		l.warnLogger.Print(msg)
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
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return s[:maxLen]
	}
	return s[:maxLen-3] + "..."
}
