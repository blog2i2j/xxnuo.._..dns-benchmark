package main

import (
	"fmt"

	log "github.com/sirupsen/logrus"
	flag "github.com/spf13/pflag"
)

// Config 结构体用于存储所有的配置选项
type Config struct {
	LogJSON         bool     // 日志格式
	LogLevel        string   // 日志级别
	PreferIPv4      bool     // 在DNS服务器的域名转换为IP地址过程中优先使用IPv4地址
	ServersDataPath string   // 要测试的服务器数据路径,必须是相对当前程序工作路径的文件路径,文件内部格式是一行一条
	DomainsDataPath string   // 要批量测试的域名数据存储的文件路径,必须是相对当前程序工作路径的文件路径,文件内部格式是一行一条
	Duration        int      // 每个测试持续时间,单位秒
	Concurrency     int      // 每个测试并发数
	NoAAAARecord    bool     // 每个测试不解析 AAAA 记录
	Servers         []string // 手动指定要测试的服务器,支持多个
	Workers         int      // 同一时间测试多少个 DNS 服务器
	OutputPath      string   // 输出结果的文件路径,必须是相对当前程序工作路径的文件路径
}

func InitFlags() (Config, error) {
	cfg := Config{}
	flag.BoolVar(&cfg.LogJSON, "json", false, "以json格式输出日志")
	flag.StringVarP(&cfg.LogLevel, "level", "l", "info", "日志级别,可选 debug,info,warn,error,fatal,panic")
	flag.BoolVar(&cfg.PreferIPv4, "prefer-ipv4", true, "在DNS服务器的域名转换为IP地址过程中优先使用IPv4地址")
	flag.StringVarP(&cfg.ServersDataPath, "file", "f", "", "要批量测试的服务器数据存储的文件路径,必须是相对当前程序工作路径的文件路径,文件内部格式是一行一条")
	flag.StringSliceVarP(&cfg.Servers, "server", "s", []string{}, "手动指定要测试的服务器,支持多个")
	flag.StringVarP(&cfg.DomainsDataPath, "domains", "d", "@sampleDomains@", "要批量测试的域名数据存储的文件路径,必须是相对当前程序工作路径的文件路径,文件内部格式是一行一条,不修改则使用内置的10000个热门域名")
	flag.IntVarP(&cfg.Duration, "duration", "t", 10, "每个测试持续时间,单位秒")
	flag.IntVarP(&cfg.Concurrency, "concurrency", "c", 10, "每个测试并发数")
	flag.IntVarP(&cfg.Workers, "worker", "w", 20, "同一时间测试多少个 DNS 服务器")
	flag.BoolVar(&cfg.NoAAAARecord, "no-aaaa", false, "每个测试不解析 AAAA 记录")
	flag.StringVarP(&cfg.OutputPath, "output", "o", "", "输出结果的文件路径,必须是相对当前程序工作路径的文件路径,不指定则输出到当前工作路径下的 dnspy_benchmark_<当前时间>.html")

	flag.Parse()

	if cfg.ServersDataPath == "" && len(cfg.Servers) == 0 {
		log.Error("你没有指定要测试的服务器数据存储的文件路径或手动输入要测试的服务器")
		log.Info("是否使用内置的世界 DNS 服务器数据开始测试(服务器很多,需要测试一段时间)? [y/N]")
		var input string
		fmt.Scanln(&input)
		if input == "Y" || input == "y" {
			cfg.ServersDataPath = "@sampleServers@"
		} else {
			// log.Error("没有有效数据,程序退出")
			return cfg, fmt.Errorf("没有有效数据")
		}
	}

	return cfg, nil
}
