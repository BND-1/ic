# 北航器件制备工艺智能助手

这是一个基于React开发的智能工艺流程设计系统，用于辅助北航实验室仪器制备方案的设计和规划。

## 项目特点

- 🎯 智能工艺流程设计
- 💬 AI对话交互功能
- 📊 可视化流程图展示
- 📝 动态工艺问卷系统
- 🎨 美观的用户界面
- 📱 响应式设计，支持移动端

## 项目结构

```
ic/
├── public/                # 静态资源目录
│   ├── ai.svg            # AI图标
│   ├── form.svg          # 表单图标
│   ├── send.svg          # 发送图标
│   ├── user.svg          # 用户图标
│   └── ...
├── src/                  # 源代码目录
│   ├── api/              # API接口
│   │   └── request.js    # 请求配置和API调用
│   ├── components/       # 组件目录
│   │   ├── ChatDialog/   # AI对话组件
│   │   ├── MermaidDiagram/ # 流程图组件
│   │   ├── Modal/        # 模态框组件
│   │   └── ProcessForm/  # 工艺表单组件
│   ├── layouts/          # 布局组件
│   ├── pages/           # 页面组件
│   │   └── Home/        # 主页
│   ├── router/          # 路由配置
│   ├── styles/          # 全局样式
│   └── App.js           # 应用入口
```

## 主要功能

1. **AI对话功能**
   - 智能工艺流程推荐
   - 实时对话交互
   - 支持流程图生成

2. **流程图可视化**
   - 基于Mermaid.js的流程图渲染
   - 支持缩放、拖拽
   - 节点交互功能

3. **工艺问卷系统**
   - 动态问题生成
   - 多步骤表单
   - 智能推荐方案

## 环境要求

- Node.js >= 14.0.0
- npm >= 6.14.0

## 安装和运行

1. **克隆项目**
```bash
git clone [项目地址]
cd ic
```

2. **安装依赖**
```bash
npm install
```

3. **开发环境运行**
```bash
npm start
```
访问 http://localhost:3000 查看应用

4. **生产环境构建**
```bash
npm run build
```

5. **运行测试**
```bash
npm test
```

## 部署说明

1. **常规部署**
```bash
npm run build
```
将生成的`build`目录部署到Web服务器

2. **使用Docker部署**
```bash
# 构建Docker镜像
docker build -t ic-app .

# 运行容器
docker run -p 80:80 ic-app
```

## 开发指南

### 开发服务器
```bash
npm start              # 启动开发服务器
npm run build         # 构建生产版本
npm test             # 运行测试
npm run eject        # 暴露配置文件
```

### 环境变量配置
在项目根目录创建`.env`文件：
```
REACT_APP_API_BASE_URL=你的API地址
```

## 技术栈

- React 18
- React Router v6
- Mermaid.js
- Axios
- SCSS Modules

## 注意事项

1. 确保API密钥配置正确
2. 开发时注意保持代码规范
3. 提交前进行必要的测试
4. 注意保护敏感信息

## 常见问题

1. **启动失败**
   - 检查Node.js版本
   - 确认依赖安装完整
   - 检查端口占用情况

2. **API连接失败**
   - 确认API地址配置
   - 检查网络连接
   - 验证API密钥有效性

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 发起Pull Request

## 许可证

MIT License

## 联系方式

- 项目维护：成都渡舟智能科技有限公司
- 技术支持：[vx：AMLmorri]
