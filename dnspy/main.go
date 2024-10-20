package main

import (
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"math/rand"

	"github.com/oschwald/geoip2-golang"
	log "github.com/sirupsen/logrus"
	"github.com/skratchdot/open-golang/open"
)

const TemplateHTMLPlaceholder = "__JSON_DATA_PLACEHOLDER__"

// Global Variables
var Cfg Config
var GeoDB *geoip2.Reader
var WorkDir string
var TempDir string
var DomainsBinPath string
var DnspyreBinPath string
var Servers []string
var OutputPath string
var OutputFile *os.File
var RetData BenchmarkResult

func main() {
	var err error
	nowTime := time.Now()
	InitLog(false, "info")

	Cfg, err = InitFlags()
	if err != nil {
		log.WithFields(log.Fields{
			"错误": err,
		}).Fatalf("\x1b[31m没有有效数据,程序退出\x1b[0m")
	}
	// 将cfg.Servers添加到全局变量Servers
	Servers = Cfg.Servers

	InitLog(Cfg.LogJSON, Cfg.LogLevel)

	// 直接打开输出文件
	OutputPath = Cfg.OutputPath
	if OutputPath == "" {
		OutputPath = fmt.Sprintf("dnspy_benchmark_%s.html", nowTime.Local().Format("2006-01-02-15-04-05"))
	}

	OutputFile, err = os.Create(OutputPath)
	if err != nil {
		log.WithFields(log.Fields{
			"错误":   err,
			"输出文件": OutputPath,
		}).Fatalf("\x1b[31m无法创建输出文件\x1b[0m")
	}
	defer OutputFile.Close()

	log.WithFields(log.Fields{
		"输出文件": OutputPath,
	}).Infof("\x1b[32m结果输出到文件\x1b[0m")

	GeoDB, err = InitGeoDB()
	if err != nil {
		log.WithFields(log.Fields{
			"错误": err,
		}).Fatalf("\x1b[31m无法打开GeoIP数据库\x1b[0m")
	}
	defer GeoDB.Close()

	// 主函数流程
	WorkDir, err = os.Getwd()
	if err != nil {
		log.WithFields(log.Fields{
			"错误": err,
		}).Fatalf("\x1b[31m无法获取当前工作目录\x1b[0m")
	}
	// 在临时文件夹中取一个文件夹
	TempDir, err = os.MkdirTemp("", "dnspy")
	if err != nil {
		log.WithFields(log.Fields{
			"错误": err,
		}).Fatalf("\x1b[31m无法创建临时文件夹\x1b[0m")
	}
	defer os.RemoveAll(TempDir)
	// log.Infof("临时文件夹: %s", TempDir)

	// 配置域名数据
	if Cfg.DomainsDataPath == "@sampleDomains@" {
		domainsData, _ := GetDomainsData()
		DomainsBinPath = filepath.Join(TempDir, "domains")
		err := os.WriteFile(DomainsBinPath, domainsData, 0644)
		if err != nil {
			log.WithFields(log.Fields{
				"错误": err,
			}).Fatalf("\x1b[31m无法导出域名数据\x1b[0m")
		}
	} else {
		// 取 Cfg.DomainsDataPath 相对 WorkDir 的文件路径
		DomainsBinPath = filepath.Join(WorkDir, Cfg.DomainsDataPath)
		if _, err := os.Stat(DomainsBinPath); os.IsNotExist(err) {
			log.WithFields(log.Fields{
				"错误": err,
			}).Fatalf("\x1b[31m输入的域名数据文件不存在\x1b[0m")
		}
	}

	// log.Info("导出域名数据路径: ", DomainsBinPath)

	// 读取服务器列表文件
	if Cfg.ServersDataPath == "@sampleServers@" {
		serversData, _ := GetSampleServersData()
		Servers, err = FormatListData(&serversData)
	} else {
		if Cfg.ServersDataPath != "" {
			Servers, err = FormatListFile(Cfg.ServersDataPath)
			if err != nil {
				log.WithFields(log.Fields{
					"错误": err,
				}).Fatalf("\x1b[31m无法格式化服务器列表文件\x1b[0m")
			}
		}
	}

	log.Infof("需要测试的服务器数量: %d", len(Servers))

	// 导出 dnspyre 二进制文件
	dnspyreBinData, filename := GetDnspyreBin()
	DnspyreBinPath = filepath.Join(TempDir, filename)
	err = os.WriteFile(DnspyreBinPath, dnspyreBinData, 0644)
	if err != nil {
		log.WithFields(log.Fields{
			"错误": err,
		}).Fatalf("\x1b[31m无法写入 dnspyre 二进制文件\x1b[0m")
	}
	// 添加执行权限
	if err := os.Chmod(DnspyreBinPath, 0755); err != nil {
		log.WithFields(log.Fields{
			"错误": err,
		}).Fatalf("\x1b[31m打开测试工具失败\x1b[0m")
	}

	serverCount := len(Servers)
	// 检查是否有有效数据
	if Cfg.Workers == 0 || serverCount == 0 {
		log.Fatalf("\x1b[31m没有有效数据,程序退出\x1b[0m")
	}

	RetData = make(map[string]jsonResult, serverCount)

	// 生成0到1之间的随机小数，保留两位小数
	randomGenerator := rand.New(rand.NewSource(nowTime.UnixNano()))
	randomNum := math.Round(randomGenerator.Float64()*100) / 100

	// 单线程测试
	if Cfg.Workers == 1 {
		for _, server := range Servers {
			output := runDnspyre(GeoDB, Cfg.PreferIPv4, Cfg.NoAAAARecord, DnspyreBinPath, server, DomainsBinPath, Cfg.Duration, Cfg.Concurrency, randomNum)
			RetData[server] = output
		}
	} else {
		// 多线程测试,使用 Cfg.Workers 控制一次最多开启的线程数
		var wg sync.WaitGroup
		semaphore := make(chan struct{}, Cfg.Workers)

		for _, server := range Servers {
			wg.Add(1)
			semaphore <- struct{}{}
			go func(srv string) {
				defer wg.Done()
				defer func() { <-semaphore }()
				output := runDnspyre(GeoDB, Cfg.PreferIPv4, Cfg.NoAAAARecord, DnspyreBinPath, srv, DomainsBinPath, Cfg.Duration, Cfg.Concurrency, randomNum)
				RetData[srv] = output
			}(server)
		}

		wg.Wait()
	}

	log.Info("测试完成")
	// log.Info("测试结果: ", RetData)

	// 替换模板中的占位符并输出 HTML 文件
	htmlTemplateData, _ := GetTemplateHTML()
	htmlObjectString, err := RetData.ToHTMLObjectString()
	if err != nil {
		log.WithFields(log.Fields{
			"错误": err,
		}).Fatalf("\x1b[31m无法将测试结果转换为 HTML 模板中用来替换的文本\x1b[0m")
	}
	htmlTemplate := strings.Replace(string(htmlTemplateData), TemplateHTMLPlaceholder, htmlObjectString, 1)

	_, err = OutputFile.WriteString(htmlTemplate)
	if err != nil {
		log.WithFields(log.Fields{
			"错误":   err,
			"输出文件": OutputPath,
		}).Fatalf("\x1b[31m无法写入输出文件\x1b[0m")
	}
	log.WithFields(log.Fields{
		"输出文件": OutputPath,
	}).Infof("\x1b[32m测试结果已输出到文件\x1b[0m")

	log.Info("是否使用默认浏览器打开输出文件[Y/n]")
	var input string
	fmt.Scanln(&input)
	if input == "Y" || input == "y" || input == "" {
		err := open.Run(OutputPath)
		if err != nil {
			log.WithError(err).Error("无法打开输出文件")
		}
	}
}
