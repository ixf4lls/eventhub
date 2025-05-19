package service

import (
	"errors"
	"eventhub-backend/internal/domain"
	"eventhub-backend/internal/repository"
	"time"
)

type EventService struct {
	eventRepo        repository.GormEventRepository
	orgRepo          repository.GormOrganizationRepository
	elasticsearchURL string
}

func NewEventService(eventRepo repository.GormEventRepository, orgRepo repository.GormOrganizationRepository, elasticsearchURL string) *EventService {
	return &EventService{eventRepo: eventRepo, orgRepo: orgRepo, elasticsearchURL: elasticsearchURL}
}

func (s *EventService) GetAllUser(userID uint) ([]repository.EventResponse, []repository.EventResponse, []repository.EventResponse, error) {
	userJoined, err := s.orgRepo.GetUserJoined(userID)
	if err != nil {
		return nil, nil, nil, err
	}

	userCreator, err := s.orgRepo.GetUserCreator(userID)
	if err != nil {
		return nil, nil, nil, err
	}

	return s.eventRepo.GetAllUser(userID, userJoined, userCreator)
}

func (s *EventService) Join(userID, eventID uint) error {
	exists, err := s.eventRepo.IsEventExist(eventID)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("event not found")
	}

	joined, err := s.eventRepo.IsUserJoined(userID, eventID)
	if err != nil {
		return err
	}
	if joined {
		return errors.New("user already joined")
	}

	return s.eventRepo.Join(userID, eventID)
}

func (s *EventService) Quit(userID, eventID uint) error {
	exists, err := s.eventRepo.IsEventExist(eventID)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("event not found")
	}

	joined, err := s.eventRepo.IsUserJoined(userID, eventID)
	if err != nil {
		return err
	}
	if !joined {
		return errors.New("user not joined")
	}

	return s.eventRepo.Quit(userID, eventID)
}

func (s *EventService) Create(input domain.CreateEventInput, creatorID, orgID uint) error {
	today := time.Now().Truncate(24 * time.Hour)
	if input.Date.Before(today) {
		return errors.New("дата в прошлом")
	}

	event, err := s.eventRepo.Create(input, creatorID, orgID)
	if err != nil {
		return err
	}

	go createEventDocInElastic(s.elasticsearchURL, event)

	return nil
}

func (s *EventService) GetByID(eventID, userID uint) (repository.EventResponse, bool, error) {
	return s.eventRepo.GetByID(eventID, userID)
}

func (s *EventService) IsUserJoined(userID, eventID uint) (bool, error) {
	return s.eventRepo.IsUserJoined(userID, eventID)
}

func (s *EventService) IsUserCreator(userID, eventID uint) (bool, error) {
	return s.eventRepo.IsUserCreator(userID, eventID)
}

func (s *EventService) Delete(userID, eventID uint) error {
	isCreator, err := s.eventRepo.IsUserCreator(userID, eventID)
	if err != nil {
		return err
	}

	if !isCreator {
		return errors.New("access denied")
	}

	return s.eventRepo.Delete(eventID)
}

func (s *EventService) Update(userID, eventID, orgID uint, input domain.CreateEventInput) error {
	isCreator, err := s.eventRepo.IsUserCreator(userID, eventID)
	if err != nil {
		return err
	}
	if !isCreator {
		return errors.New("access denied")
	}

	exists, err := s.eventRepo.IsEventExist(eventID)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("event not exists")
	}

	existsInOrg, err := s.orgRepo.CheckIfEventExists(orgID, eventID)
	if err != nil {
		return err
	}
	if !existsInOrg {
		return errors.New("event not exists in this organization")
	}

	event := repository.EventModel{
		ID:             eventID,
		Title:          input.Title,
		Description:    input.Description,
		Category:       input.Category,
		IsPublic:       input.IsPublic,
		Status:         "active",
		Date:           input.Date,
		StartTime:      input.StartTime,
		EndTime:        input.EndTime,
		Location:       input.Location,
		CreatorId:      userID,
		OrganizationId: orgID,
	}

	err = s.eventRepo.Update(&event)
	if err != nil {
		return err
	}

	go createEventDocInElastic(s.elasticsearchURL, &event)

	return nil
}

func (s *EventService) GetParticipantIDs(eventID uint) ([]uint, error) {
	return s.eventRepo.GetParticipantIDs(eventID)
}

func (s *EventService) UpdateSearchIndex() error {
	events, err := s.eventRepo.GetAll()

	if err != nil {
		return err
	}

	for _, event := range events {
		go createEventDocInElastic(s.elasticsearchURL, &event)
	}

	return nil
}
