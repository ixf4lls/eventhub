package repository

import (
	"errors"
	"eventhub-backend/internal/domain"
	"time"

	"gorm.io/gorm"
)

type GormEventRepository struct {
	db *gorm.DB
}

func NewGormEventRepository(db *gorm.DB) *GormEventRepository {
	return &GormEventRepository{db: db}
}

func parseEventTime(events []EventModel) []EventResponse {
	response := make([]EventResponse, 0, len(events))
	for _, event := range events {
		response = append(response, EventResponse{
			ID:          event.ID,
			Title:       event.Title,
			Description: event.Description,
			Category:    event.Category,
			IsPublic:    event.IsPublic,
			Status:      event.Status,
			Date:        event.Date.Format("2006-01-02"),
			StartTime:   event.StartTime,
			EndTime:     event.EndTime,
			Location:    event.Location,
			CreatorId:   event.CreatorId,
		})
	}
	return response
}

func (r *GormEventRepository) GetAll() ([]EventModel, error) {
	var events []EventModel

	if err := r.db.Table("events").Find(&events).Error; err != nil {
		return nil, err
	}

	return events, nil
}

func (r *GormEventRepository) GetAllUser(userID uint, userJoinedOrgs, userCreatorOrgs []uint) ([]EventResponse, []EventResponse, []EventResponse, error) {
	var joinedEventIDs []uint
	var joinedEvents, openEvents, availableClosedEvents []EventModel

	// мероприятия, в которых участвует пользователь
	if err := r.db.Table("event_participants").Where("user_id = ?", userID).Pluck("event_id", &joinedEventIDs).Error; err != nil {
		return nil, nil, nil, err
	}
	if len(joinedEventIDs) > 0 {
		if err := r.db.Where("id IN ?", joinedEventIDs).Find(&joinedEvents).Error; err != nil {
			return nil, nil, nil, err
		}
	}

	// все открытые мероприятия
	if err := r.db.Where("is_public = ?", true).Find(&openEvents).Error; err != nil {
		return nil, nil, nil, err
	}

	// доступные закрытые мероприятия (из организаций)
	accessibleOrgIDs := append(userJoinedOrgs, userCreatorOrgs...)
	var availableClosedEventIDs []uint

	if len(accessibleOrgIDs) > 0 {
		if err := r.db.
			Model(&EventModel{}).
			Where("organization_id IN ?", accessibleOrgIDs).
			Where("is_public = ?", false).
			Pluck("id", &availableClosedEventIDs).Error; err != nil {
			return nil, nil, nil, err
		}

		if len(availableClosedEventIDs) > 0 {
			if err := r.db.Where("id IN ?", availableClosedEventIDs).Find(&availableClosedEvents).Error; err != nil {
				return nil, nil, nil, err
			}
		}
	}

	return parseEventTime(joinedEvents), parseEventTime(openEvents), parseEventTime(availableClosedEvents), nil
}

func (r *GormEventRepository) GetUpcoming() ([]EventModel, error) {
	var events []EventModel

	now := time.Now()
	limit := now.Add(48 * time.Hour)

	if err := r.db.
		Where("(date + start_time::time) BETWEEN ? AND ?", now, limit).
		Find(&events).Error; err != nil {
		return nil, err
	}

	return events, nil
}

func (r *GormEventRepository) GetEventIDsToMarkCompleted() ([]EventModel, error) {
	var events []EventModel
	if err := r.db.Where("(date + start_time::time) <= ?", time.Now()).Where("status = ?", "active").Find(&events).Error; err != nil {
		return nil, err
	}

	return events, nil
}

func (r *GormEventRepository) MarkEventsCompleted(events []EventModel) error {
	var eventIDs []uint
	for _, event := range events {
		eventIDs = append(eventIDs, event.ID)
	}

	if err := r.db.Table("events").Where("id IN (?)", eventIDs).Update("status", "completed").Error; err != nil {
		return err
	}

	return nil
}

func (r *GormEventRepository) Join(userID, eventID uint) error {
	eventParticipant := EventParticipantModel{
		UserID:  userID,
		EventID: eventID,
	}

	if err := r.db.Create(&eventParticipant).Error; err != nil {
		return err
	}

	return nil
}

func (r *GormEventRepository) Quit(userID, eventID uint) error {
	EventParticipant := EventParticipantModel{
		UserID:  userID,
		EventID: eventID,
	}

	if err := r.db.Delete(&EventParticipant).Error; err != nil {
		return err
	}

	return nil
}

func (r *GormEventRepository) Create(input domain.CreateEventInput, creatorID, orgID uint) (*EventModel, error) {
	event := EventModel{
		Title:          input.Title,
		Description:    input.Description,
		Category:       input.Category,
		Status:         "active",
		Location:       input.Location,
		IsPublic:       input.IsPublic,
		CreatorId:      creatorID,
		Date:           input.Date,
		StartTime:      input.StartTime,
		EndTime:        input.EndTime,
		OrganizationId: orgID,
	}

	if err := r.db.Create(&event).Error; err != nil {
		return nil, err
	}

	return &event, nil
}

func (r *GormEventRepository) IsEventExist(eventID uint) (bool, error) {
	var event EventModel
	if err := r.db.Where("id = ? AND status != ?", eventID, "deleted").First(&event).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (r *GormEventRepository) IsUserJoined(userID, eventID uint) (bool, error) {
	var eventParticipant EventParticipantModel
	if err := r.db.Where("user_id = ? AND event_id = ?", userID, eventID).First(&eventParticipant).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (r *GormEventRepository) GetByID(eventID, userID uint) (EventResponse, bool, error) {
	var event EventModel
	if err := r.db.Where("id = ?", eventID).First(&event).Error; err != nil {
		return EventResponse{}, false, err
	}

	return EventResponse{
		ID:             event.ID,
		Title:          event.Title,
		Description:    event.Description,
		Category:       event.Category,
		IsPublic:       event.IsPublic,
		Status:         event.Status,
		Date:           event.Date.Format("2006-01-02"),
		StartTime:      event.StartTime,
		EndTime:        event.EndTime,
		Location:       event.Location,
		CreatorId:      event.CreatorId,
		OrganizationId: event.OrganizationId,
	}, userID == event.CreatorId, nil
}

func (r *GormEventRepository) GetEventModelByID(eventID uint) (EventModel, error) {
	var event EventModel
	if err := r.db.Where("id = ?", eventID).First(&event).Error; err != nil {
		return EventModel{}, err
	}

	return event, nil
}

func (r *GormEventRepository) GetParticipantIDs(eventID uint) ([]uint, error) {
	var participantIDs []uint
	err := r.db.Table("event_participants").Where("event_id = ?", eventID).Pluck("user_id", &participantIDs).Error
	return participantIDs, err
}

func (r *GormEventRepository) Delete(eventID uint) error {
	return r.db.Model(&EventModel{}).
		Where("id = ?", eventID).
		Update("status", "deleted").Error
}

func (r *GormEventRepository) IsUserCreator(userID, eventID uint) (bool, error) {
	var event EventModel

	if err := r.db.Where("id = ?", eventID).First(&event).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}

	return event.CreatorId == userID, nil
}

func (r *GormEventRepository) Update(event *EventModel) error {
	return r.db.Save(event).Error
}
