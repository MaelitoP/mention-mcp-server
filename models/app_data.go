package models

type AppData struct {
	AlertLanguages map[string]Language `json:"alert_languages"`
	AlertCountries map[string]string   `json:"alert_countries"`
	AlertSources   map[string]Source   `json:"alert_sources"`
}

type Language struct {
	Name  string `json:"name"`
	Order int    `json:"order"`
}

type Source struct {
	Name  string            `json:"name"`
	Icons map[string]string `json:"icons"`
	Order int               `json:"order"`
}
