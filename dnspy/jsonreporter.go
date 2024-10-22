package main

import (
	"encoding/json"
)

type latencyStats struct {
	MinMs  int64 `json:"minMs"`
	MeanMs int64 `json:"meanMs"`
	StdMs  int64 `json:"stdMs"`
	MaxMs  int64 `json:"maxMs"`
	P99Ms  int64 `json:"p99Ms"`
	P95Ms  int64 `json:"p95Ms"`
	P90Ms  int64 `json:"p90Ms"`
	P75Ms  int64 `json:"p75Ms"`
	P50Ms  int64 `json:"p50Ms"`
}

type jsonResult struct {
	// 用到了的 dnspyre 输出 JSON 格式的字段结构体定义
	TotalRequests            int64            `json:"totalRequests"`
	TotalSuccessResponses    int64            `json:"totalSuccessResponses"`
	TotalNegativeResponses   int64            `json:"totalNegativeResponses"`
	TotalErrorResponses      int64            `json:"totalErrorResponses"`
	TotalIOErrors            int64            `json:"totalIOErrors"`
	TotalTruncatedResponses  int64            `json:"totalTruncatedResponses"`
	ResponseRcodes           map[string]int64 `json:"responseRcodes,omitempty"`
	QuestionTypes            map[string]int64 `json:"questionTypes"`
	QueriesPerSecond         float64          `json:"queriesPerSecond"`
	BenchmarkDurationSeconds float64          `json:"benchmarkDurationSeconds"`
	LatencyStats             latencyStats     `json:"latencyStats"`
	// 这个 json 的字段首字母大小写是 dnspyre 3.4.0 及之前的版本中写错的，目前作者还未更新，暂时保持一致
	TotalIDmismatch int64 `json:"TotalIDmismatch"`
	// add:地理信息
	IPAddress string  `json:"ip"`
	Geocode   string  `json:"geocode"`
	Score     float64 `json:"score"`
}

// 自定义 BenchmarkResult 类型，用于 JSON 序列化
type BenchmarkResult map[string]jsonResult

func (b *BenchmarkResult) String() (string, error) {
	jsonData, err := json.Marshal(b)
	if err != nil {
		return "", err
	}
	// return template.JSEscapeString(string(jsonData)), nil
	return string(jsonData), nil
}
