我测了全世界...的 DNS 服务器

# 测试全世界的 DNS 服务器能否访问及性能 - 超级多

如题，测试全世界的 DNS 服务器能否访问及性能，一共有 `989` 个 DNS 服务器地址，列表在 `providers.txt` 文件中（包括同一个服务的 UDP、DoH、DoT 地址）。测了 3 个小时，终于测完了。
中部电信，Wi-Fi6E 环境，macOS 14.5，每个服务器测 10 秒。
话不多说，直接上结果。

## 测试结果

> 可点击柱状图的每个柱子复制对应 DNS 服务器地址
>
> 标题下按钮可切换数据源，有
>
> - `加密 DNS 服务器（DoH、DoT、QUIC）`（默认展示类型）
> - `所有 DNS 服务器数据（加密 DNS 服务器 + IPv4、IPv6 非加密服务器）`

[数据页面](https://xxnuo.github.io/dns-benchmark/results.html)

[数据页面(国内镜像)](https://dns-benchmark.gh.2020818.xyz/results.html)

## 测试结果预览图

![测试结果预览](./images/preview.jpeg)

具体项目去数据页面看吧！

## 自测工具 dnspy

在 Github 仓库 [dns-benchmark/releases](https://github.com/xxnuo/dns-benchmark/releases) 中，
按你的系统架构下载 `dnspy-*` 文件，比如我的 PC 是 Intel 处理器的 macOS，所以下载 `dnspy-darwin-amd64` 文件。
重命名文件为 `dnspy`（Windows 是 `dnspy.exe`），然后打开终端，进入到你这个文件所在的目录。

多线程模式默认开启，以加快测试速度。

但是默认参数 10 个线程需要至少上下行 1 MB/s 网络和至少 4 核心处理器。
如果网络或处理器不好，会导致测试结果不准确，必须通过`-w` 参数降低线程数。

必须关闭所有代理软件的 Tun 模式、虚拟网卡模式，否则会影响测试结果。

TODO:编写说明

得到 `results.html` 文件，会自动用浏览器打开。
Done!

## 如果你想自己编译 dnspy

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
```

即可在当前目录下得到名为 `dnspy` 的可执行文件。

TODO:编写数据展示页面