package services

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"mention-mcp-server/models"
)

type MockMentionClient struct {
	mock.Mock
}

func (m *MockMentionClient) CreateBasicAlert(ctx context.Context, req models.CreateAlertRequest) (*models.CreateAlertResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CreateAlertResponse), args.Error(1)
}

func (m *MockMentionClient) GetAppData(ctx context.Context) (*models.AppData, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.AppData), args.Error(1)
}

type MockLogger struct {
	mock.Mock
}

func (m *MockLogger) Info(msg string, args ...interface{}) {
	callArgs := []interface{}{msg}
	if len(args) > 0 {
		callArgs = append(callArgs, args)
	}
	m.Called(callArgs...)
}

func (m *MockLogger) Error(msg string, args ...interface{}) {
	callArgs := []interface{}{msg}
	if len(args) > 0 {
		callArgs = append(callArgs, args)
	}
	m.Called(callArgs...)
}

func (m *MockLogger) Debug(msg string, args ...interface{}) {
	callArgs := []interface{}{msg}
	if len(args) > 0 {
		callArgs = append(callArgs, args)
	}
	m.Called(callArgs...)
}

func (m *MockLogger) Warn(msg string, args ...interface{}) {
	callArgs := []interface{}{msg}
	if len(args) > 0 {
		callArgs = append(callArgs, args)
	}
	m.Called(callArgs...)
}

func TestAlertService_CreateBasicAlert_Success(t *testing.T) {
	mockClient := new(MockMentionClient)
	mockLogger := new(MockLogger)
	service := NewAlertService(mockClient, mockLogger)

	ctx := context.Background()
	req := AlertCreateRequest{
		Name:             "Test Alert",
		IncludedKeywords: []string{"test", "keyword"},
		Languages:        []string{"en"},
		Sources:          []string{"web", "news"},
	}

	expectedAPIReq := models.CreateAlertRequest{
		Name: "Test Alert",
		Query: models.Query{
			Type:             "basic",
			IncludedKeywords: []string{"test", "keyword"},
		},
		Languages: []string{"en"},
		Sources:   []string{"web", "news"},
	}

	expectedResponse := &models.CreateAlertResponse{
		Alert: models.Alert{
			ID:   "alert-123",
			Name: "Test Alert",
		},
	}

	mockLogger.On("Info", "Creating alert: %s", []interface{}{"Test Alert"})
	mockClient.On("CreateBasicAlert", ctx, expectedAPIReq).Return(expectedResponse, nil)
	mockLogger.On("Info", "Successfully created alert with ID: %s", []interface{}{"alert-123"})

	result, err := service.CreateBasicAlert(ctx, req)

	assert.NoError(t, err)
	assert.Equal(t, expectedResponse, result)
	mockClient.AssertExpectations(t)
	mockLogger.AssertExpectations(t)
}

func TestAlertService_CreateBasicAlert_ValidationError(t *testing.T) {
	tests := []struct {
		name        string
		req         AlertCreateRequest
		expectedErr string
	}{
		{
			name: "empty name",
			req: AlertCreateRequest{
				IncludedKeywords: []string{"test"},
				Languages:        []string{"en"},
				Sources:          []string{"web"},
			},
			expectedErr: "validation failed: alert name is required",
		},
		{
			name: "no included keywords",
			req: AlertCreateRequest{
				Name:      "Test Alert",
				Languages: []string{"en"},
				Sources:   []string{"web"},
			},
			expectedErr: "validation failed: at least one included keyword is required",
		},
		{
			name: "no languages",
			req: AlertCreateRequest{
				Name:             "Test Alert",
				IncludedKeywords: []string{"test"},
				Sources:          []string{"web"},
			},
			expectedErr: "validation failed: at least one language is required",
		},
		{
			name: "no sources",
			req: AlertCreateRequest{
				Name:             "Test Alert",
				IncludedKeywords: []string{"test"},
				Languages:        []string{"en"},
			},
			expectedErr: "validation failed: at least one source is required",
		},
		{
			name: "invalid source",
			req: AlertCreateRequest{
				Name:             "Test Alert",
				IncludedKeywords: []string{"test"},
				Languages:        []string{"en"},
				Sources:          []string{"invalid_source"},
			},
			expectedErr: "validation failed: invalid source type: invalid_source",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := new(MockMentionClient)
			mockLogger := new(MockLogger)
			service := NewAlertService(mockClient, mockLogger)

			result, err := service.CreateBasicAlert(context.Background(), tt.req)

			assert.Error(t, err)
			assert.Nil(t, result)
			assert.Equal(t, tt.expectedErr, err.Error())
		})
	}
}

func TestAlertService_CreateBasicAlert_ClientError(t *testing.T) {
	mockClient := new(MockMentionClient)
	mockLogger := new(MockLogger)
	service := NewAlertService(mockClient, mockLogger)

	ctx := context.Background()
	req := AlertCreateRequest{
		Name:             "Test Alert",
		IncludedKeywords: []string{"test"},
		Languages:        []string{"en"},
		Sources:          []string{"web"},
	}

	clientError := errors.New("API error")

	mockLogger.On("Info", "Creating alert: %s", []interface{}{"Test Alert"})
	mockClient.On("CreateBasicAlert", ctx, mock.AnythingOfType("models.CreateAlertRequest")).Return(nil, clientError)
	mockLogger.On("Error", "Failed to create alert: %v", []interface{}{clientError})

	result, err := service.CreateBasicAlert(ctx, req)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, clientError, err)
	mockClient.AssertExpectations(t)
	mockLogger.AssertExpectations(t)
}

func TestAlertService_GetAppData_Success(t *testing.T) {
	mockClient := new(MockMentionClient)
	mockLogger := new(MockLogger)
	service := NewAlertService(mockClient, mockLogger)

	ctx := context.Background()
	expectedData := &models.AppData{
		AlertLanguages: map[string]models.Language{
			"en": {Name: "English", Order: 1},
		},
		AlertCountries: map[string]string{
			"US": "United States",
		},
		AlertSources: map[string]models.Source{
			"web": {Name: "Web", Order: 1},
		},
	}

	mockLogger.On("Info", "Fetching app data")
	mockClient.On("GetAppData", ctx).Return(expectedData, nil)
	mockLogger.On("Info", "Successfully retrieved app data")

	result, err := service.GetAppData(ctx)

	assert.NoError(t, err)
	assert.Equal(t, expectedData, result)
	mockClient.AssertExpectations(t)
	mockLogger.AssertExpectations(t)
}

func TestAlertService_GetAppData_Error(t *testing.T) {
	mockClient := new(MockMentionClient)
	mockLogger := new(MockLogger)
	service := NewAlertService(mockClient, mockLogger)

	ctx := context.Background()
	clientError := errors.New("API error")

	mockLogger.On("Info", "Fetching app data")
	mockClient.On("GetAppData", ctx).Return(nil, clientError)
	mockLogger.On("Error", "Failed to get app data: %v", []interface{}{clientError})

	result, err := service.GetAppData(ctx)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, clientError, err)
	mockClient.AssertExpectations(t)
	mockLogger.AssertExpectations(t)
}
