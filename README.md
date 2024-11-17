# dnspy - 用于本地测试全世界的 DNS 服务器的可访问性和性能的测试工具

[English](./README.en.md) | [中文](./README.md)

苦于国内的 DNS 被运营商劫持插入各种广告，需要可靠的服务来支持我们正常安全的上网。
dnsjumper 存在仅支持 Windows、数据源较少、评测维度少的问题
所以做了个工具来测试一下本地网络能正常使用的服务器以及服务器的性能的工具，使用 Golang 编写支持 Windows、macOS、Linux。
并且附带可视化分析网站让你一目了然的知道可以用哪些 DNS 服务器😊，温馨提示：点击数据分析面板的柱状图即可复制服务器地址

使用方法：按下文指导下载测试工具获得测试结果的 json 文件，打开分析面板网站上传数据分析即可。网站不存储数据。

### 数据分析面板预览

![数据分析面板预览](./images/preview.png)

[数据分析面板，内含示例数据](https://bench.dash.2020818.xyz)

## 测试工具

在本仓库的 [releases](https://github.com/xxnuo/dns-benchmark/releases) 页面中按你的系统架构下载 `dnspy-*` 文件，比如我的 PC 是 Intel 处理器的 macOS，所以下载 `dnspy-darwin-amd64` 文件。

然后**必须关闭所有代理软件的 Tun 模式、虚拟网卡模式，否则会影响测试结果。**

重命名文件为 `dnspy`（Windows 是 `dnspy.exe`），然后打开终端，进入到你这个文件所在的目录。执行命令开始测试

```bash
unset http_proxy https_proxy all_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY
./dnspy
```

按提示输入启动测试

默认使用多线程模式，以加快测试速度。但是默认参数 10 个线程需要至少上下行 1 MB/s 网络和至少 4 核心处理器。
如果网络或处理器不好，会导致测试结果不准确，必须通过`-w` 参数降低线程数。

测试完成后会输出到当前目录下形如 `dnspy_result_2024-11-07-17-32-13.json` 的 JSON 文件中。

按程序提示输入 `Y` 或 `y` 或直接回车，会自动打开数据分析面板网站，点击网站右上角的 `读取分析` 按钮，选择你刚才的 JSON 文件，就可以看到可视化测试结果了。

## 编译测试工具

编译所需环境：

- 你的电脑上需要有 `Go` 环境、`curl` 命令
- 能够访问 Github 下载资源文件

编译过程：

```bash
# 下载本仓库
git clone https://github.com/xxnuo/dns-benchmark.git
cd dns-benchmark/dnspy
# 更新所需数据（需要科学上网）
make update
make
./dnspy
```
