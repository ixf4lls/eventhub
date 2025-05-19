package service

import (
	"bytes"
	"encoding/json"
	"eventhub-backend/internal/repository"
	"fmt"
	"io"
	"log"
	"net/http"
)

type EventES struct {
	ID             uint   `json:"id"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	Category       string `json:"category"`
	Status         string `json:"status"`
	Location       string `json:"location"`
	IsPublic       bool   `json:"is_public"`
	Date           string `json:"date"`
	StartTime      string `json:"start_time"`
	EndTime        string `json:"end_time"`
	OrganizationID uint   `json:"organization_d"`
	CreatorID      uint   `json:"creator_id"`
}

func createEventDocInElastic(baseURL string, event *repository.EventModel) {
	esDoc := EventES{
		ID:             event.ID,
		Title:          event.Title,
		Description:    event.Description,
		Category:       event.Category,
		Status:         event.Status,
		Location:       event.Location,
		IsPublic:       event.IsPublic,
		Date:           event.Date.Format("2006-01-02"),
		StartTime:      event.StartTime[:5],
		EndTime:        event.EndTime[:5],
		OrganizationID: event.OrganizationId,
		CreatorID:      event.CreatorId,
	}

	body, err := json.Marshal(esDoc)
	if err != nil {
		log.Println("elasticsearch marshal error:", err)
		return
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("%s/events/_doc/%d", baseURL, event.ID), bytes.NewBuffer(body))
	if err != nil {
		log.Println("elasticsearch request error:", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Println("elasticsearch request failed:", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("elasticsearch returned error: %s\n", respBody)
	}
}
