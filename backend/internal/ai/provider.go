package ai

import (
	"context"
	"fmt"
	"sync"

	"gempa-sentinel/internal/models"
)

// LLMProvider defines the common interface for AI intelligence engines
type LLMProvider interface {
	Analyze(ctx context.Context, activityIndex models.ActivityIndex, recentEvents []string) (*models.AIAnalysis, error)
	AskCopilot(ctx context.Context, question string, telemetryContext string) (*models.AIQuestionResponse, error)
	StreamCopilot(ctx context.Context, question string, telemetryContext string, onToken func(token string)) (*models.AIQuestionResponse, error)
	ProviderName() string
	ModelName() string
}

// ProviderManager coordinates multiple LLM providers (Gemini, Bedrock) with dynamic runtime switching
type ProviderManager struct {
	mu             sync.RWMutex
	providers      map[string]LLMProvider
	activeProvider string
}

// NewProviderManager initializes the provider manager
func NewProviderManager(initialProvider string, providers map[string]LLMProvider) *ProviderManager {
	pm := &ProviderManager{
		providers: providers,
	}

	if _, ok := providers[initialProvider]; ok {
		pm.activeProvider = initialProvider
	} else {
		for name := range providers {
			pm.activeProvider = name
			break
		}
	}

	return pm
}

// SetActive changes the current active provider
func (pm *ProviderManager) SetActive(name string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if _, ok := pm.providers[name]; !ok {
		return fmt.Errorf("provider %s is not available", name)
	}

	pm.activeProvider = name
	return nil
}

// GetActive returns the current active provider
func (pm *ProviderManager) GetActive() LLMProvider {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	if p, ok := pm.providers[pm.activeProvider]; ok {
		return p
	}

	// Fallback to any available provider
	for _, p := range pm.providers {
		return p
	}

	return nil
}

// ActiveName returns the name of the active provider
func (pm *ProviderManager) ActiveName() string {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	return pm.activeProvider
}

// AvailableProviders returns a list of registered provider names
func (pm *ProviderManager) AvailableProviders() []string {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	names := make([]string, 0, len(pm.providers))
	for name := range pm.providers {
		names = append(names, name)
	}
	return names
}

// ListProviders returns a list of registered provider names (alias for AvailableProviders)
func (pm *ProviderManager) ListProviders() []string {
	return pm.AvailableProviders()
}

// ModelName returns the model identifier of the active provider
func (pm *ProviderManager) ModelName() string {
	if p := pm.GetActive(); p != nil {
		return p.ModelName()
	}
	return "unknown"
}

// GetModelName returns the model identifier of the active provider
func (pm *ProviderManager) GetModelName() string {
	return pm.ModelName()
}

// Analyze forwards to the active provider
func (pm *ProviderManager) Analyze(ctx context.Context, activityIndex models.ActivityIndex, recentEvents []string) (*models.AIAnalysis, error) {
	provider := pm.GetActive()
	if provider == nil {
		return nil, fmt.Errorf("no active AI provider configured")
	}
	return provider.Analyze(ctx, activityIndex, recentEvents)
}

// AskCopilot forwards to the active provider
func (pm *ProviderManager) AskCopilot(ctx context.Context, question string, telemetryContext string) (*models.AIQuestionResponse, error) {
	provider := pm.GetActive()
	if provider == nil {
		return nil, fmt.Errorf("no active AI provider configured")
	}
	return provider.AskCopilot(ctx, question, telemetryContext)
}

// StreamCopilot forwards token streaming to the active provider
func (pm *ProviderManager) StreamCopilot(ctx context.Context, question string, telemetryContext string, onToken func(token string)) (*models.AIQuestionResponse, error) {
	provider := pm.GetActive()
	if provider == nil {
		return nil, fmt.Errorf("no active AI provider configured")
	}
	return provider.StreamCopilot(ctx, question, telemetryContext, onToken)
}
