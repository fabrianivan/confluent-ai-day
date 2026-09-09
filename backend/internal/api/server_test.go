package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"gempa-sentinel/internal/agent"
	"gempa-sentinel/internal/ai"
	"gempa-sentinel/internal/hub"
	"gempa-sentinel/internal/models"
)

type mockSimulator struct{}

func (m *mockSimulator) TriggerMegathrustScenario(id string) {}
func (m *mockSimulator) TriggerVolcanicEscalation()          {}
func (m *mockSimulator) TriggerTsunami()                    {}
func (m *mockSimulator) TriggerReal2018Disaster()            {}
func (m *mockSimulator) Reset()                             {}
func (m *mockSimulator) GetStatus() models.SystemStatus     { return models.SystemStatus{} }

func setupTestServer(t *testing.T) *Server {
	h := hub.NewSSEHub()
	sim := &mockSimulator{}

	providers := make(map[string]ai.LLMProvider)
	gemini, _ := ai.NewGeminiAnalyzer("")
	providers["gemini"] = gemini
	bedrock, _ := ai.NewBedrockProvider(nil)
	providers["bedrock"] = bedrock

	pm := ai.NewProviderManager("gemini", providers)
	ag := agent.NewStreamingDataAgent(pm, h)

	return NewServer(h, sim, pm, ag, "8080", "*")
}

func TestGetAndSetAIProvider(t *testing.T) {
	s := setupTestServer(t)

	// Test GET /api/ai/provider
	req, _ := http.NewRequest("GET", "/api/ai/provider", nil)
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var getResp struct {
		Active    string   `json:"active"`
		Model     string   `json:"model"`
		Available []string `json:"available"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &getResp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if getResp.Active != "gemini" {
		t.Fatalf("expected active gemini, got %s", getResp.Active)
	}

	// Test POST /api/ai/provider -> switch to bedrock
	body, _ := json.Marshal(map[string]string{"provider": "bedrock"})
	req2, _ := http.NewRequest("POST", "/api/ai/provider", bytes.NewBuffer(body))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	s.router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w2.Code, w2.Body.String())
	}

	if s.pm.ActiveName() != "bedrock" {
		t.Fatalf("expected bedrock active after switch, got %s", s.pm.ActiveName())
	}
}

func TestGetAgentState(t *testing.T) {
	s := setupTestServer(t)

	req, _ := http.NewRequest("GET", "/api/agent/state", nil)
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var state agent.AgentState
	if err := json.Unmarshal(w.Body.Bytes(), &state); err != nil {
		t.Fatalf("failed to decode state: %v", err)
	}

	if state.Status == "" {
		t.Fatalf("expected non-empty status")
	}
}

func TestAgentChatStream(t *testing.T) {
	s := setupTestServer(t)

	reqBody, _ := json.Marshal(map[string]string{
		"question": "Status risiko gempa saat ini?",
	})
	req, _ := http.NewRequest("POST", "/api/agent/chat/stream", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	resStr := w.Body.String()
	if !bytes.Contains([]byte(resStr), []byte("event: token")) && !bytes.Contains([]byte(resStr), []byte("event: done")) {
		t.Fatalf("expected SSE events in response, got: %s", resStr)
	}
}
