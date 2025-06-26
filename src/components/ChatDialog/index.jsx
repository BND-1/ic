import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import styles from './index.module.scss';
import { sendMessageToDify } from '../../api/request';

const WELCOME_MESSAGE = {
  type: 'ai',
  content: '👋 您好，我是北航器件制备工艺智能助手。请简单描述您的工艺流程需求，我将为您生成相应的思维导图。'
};

// 添加提取特殊文本块的函数
const extractSpecialBlock = (text) => {
  const matches = text.match(/@\n([\s\S]*?)\n@/);
  if (!matches) return null;
  
  const content = matches[1];
  // 提取第一个标题作为文件名
  const titleMatch = content.match(/# (.*?)(?:\n|$)/);
  const fileName = titleMatch ? `${titleMatch[1]}.md` : 'document.md';
  
  return {
    fileName,
    content,
    fullMatch: matches[0]
  };
};

// 添加下载功能
const downloadMarkdown = (fileName, content) => {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const ChatDialog = forwardRef(({ visible, onClose, onMermaidData, onProcessesDetected }, ref) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [userId] = useState(`user_${Date.now()}`);
  const messagesEndRef = useRef(null);
  const dialogRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // 暴露重置方法和发送消息方法给父组件
  useImperativeHandle(ref, () => ({
    resetChat: () => {
      setMessages([WELCOME_MESSAGE]);
      setConversationId('');
      setInputValue('');
    },
    sendMessage: async (message) => {
      // 提取mermaid数据并处理消息显示
      const mermaidData = extractMermaidData(message);
      const processArray = extractProcessArray(message);
      
      const processedMessage = message.replace(/```mermaid\s*([\s\S]*?)\s*```/g, 
        () => '【mermaid流程图数据-点击复制-点击渲染】')
        .replace(/```/g, ''); // 移除其他可能的代码块标记

      // 直接添加用户消息和思考状态
      const userMessage = {
        type: 'user',
        content: processedMessage,
        mermaidData: mermaidData
      };
      setMessages(prev => [...prev, userMessage, { type: 'thinking' }]);

      try {
        const response = await sendMessageToDify(message, userId, conversationId);
        
        if (response.conversation_id) {
          setConversationId(response.conversation_id);
        }

        const answer = response.answer || '抱歉，我现在无法回答这个问题。';
        
        // 检查返回的消息中是否包含工艺流程数组
        const responseProcessArray = extractProcessArray(answer);
        if (responseProcessArray) {
          onProcessesDetected?.(responseProcessArray);
        }
        
        const aiMermaidData = extractMermaidData(answer);
        if (aiMermaidData) {
          onMermaidData?.(aiMermaidData);
        }

        // 处理消息显示
        const processedAnswer = answer.replace(/```mermaid\s*([\s\S]*?)\s*```/g, 
          () => '【mermaid流程图数据-点击复制-点击渲染】')
          .replace(/```/g, '');

        const aiMessage = {
          type: 'ai',
          content: processedAnswer,
          mermaidData: aiMermaidData
        };

        setMessages(prev => prev.slice(0, -1).concat([aiMessage]));
      } catch (error) {
        console.error('发送消息失败:', error);
        setMessages(prev => prev.slice(0, -1).concat([{
          type: 'ai',
          content: '抱歉，发生了一些错误，请稍后重试。'
        }]));
      }
    }
  }));

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 重置位置
  useEffect(() => {
    if (!isMobile && visible) {
      setPosition(null);
    }
  }, [visible, isMobile]);

  // 拖动相关逻辑
  const handleMouseDown = (e) => {
    if (isMobile) return;
    
    const dialog = dialogRef.current;
    const rect = dialog.getBoundingClientRect();
    
    // 如果还没有被拖动过，记录初始位置
    if (!position) {
      setPosition({
        x: rect.left,
        y: rect.top
      });
    }
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isMobile) return;
    
    const dialog = dialogRef.current;
    const maxX = window.innerWidth - dialog.offsetWidth;
    const maxY = window.innerHeight - dialog.offsetHeight;
    
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // 限制在可视区域内
    newX = Math.max(0, Math.min(maxX, newX));
    newY = Math.max(0, Math.min(maxY, newY));
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 初始化时设置欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([WELCOME_MESSAGE]);
    }
  }, []);

  // 滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 提取 Mermaid 数据
  const extractMermaidData = (text) => {
    const mermaidMatch = text.match(/```mermaid\s*([\s\S]*?)\s*```/);
    return mermaidMatch ? mermaidMatch[1].trim() : null;
  };

  // 提取工艺流程数组
  const extractProcessArray = (text) => {
    // 尝试匹配以下格式：
    // 1. 直接的数组格式：['工艺1', '工艺2']
    // 2. "AI 返回的聊天文本: ['工艺1', '工艺2']"
    // 3. 在mermaid图后的数组：```mermaid ... ``` ['工艺1', '工艺2']
    
    // 移除mermaid代码块
    const textWithoutMermaid = text.replace(/```mermaid[\s\S]*?```/g, '');
    
    // 尝试匹配数组格式
    const arrayMatch = textWithoutMermaid.match(/\[(.*?)\]/);
    if (arrayMatch) {
      try {
        // 处理数组字符串
        const arrayStr = arrayMatch[0].replace(/'/g, '"'); // 将单引号替换为双引号
        const processArray = JSON.parse(arrayStr);
        if (Array.isArray(processArray) && processArray.length > 0) {
          return processArray;
        }
      } catch (e) {
        console.error('解析工艺流程数组失败:', e);
      }
    }
    return null;
  };

  // 处理复制和渲染
  const handleCopyAndRender = async (mermaidData) => {
    try {
      // 创建一个临时文本区域
      const textArea = document.createElement('textarea');
      textArea.value = mermaidData;
      // 将文本区域添加到文档中
      document.body.appendChild(textArea);
      // 选择文本
      textArea.select();
      // 尝试复制
      const success = document.execCommand('copy');
      // 移除临时文本区域
      document.body.removeChild(textArea);

      if (!success) {
        throw new Error('复制失败');
      }

      // 强制重新渲染流程图
      onMermaidData?.(mermaidData + '\n', false); // 添加换行符触发更新
      
      // 延迟100ms后重置视图，确保新的图表已经渲染完成
      setTimeout(() => {
        onMermaidData?.(mermaidData, true);
      }, 100);
      
      alert('流程图已重新渲染，数据已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制');
    }
  };

  // 处理用户输入发送
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      type: 'user',
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage, { type: 'thinking' }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendMessageToDify(inputValue, userId, conversationId);
      
      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      const answer = response.answer || '抱歉，我现在无法回答这个问题。';
      
      // 先检查是否有工艺流程数组
      const processArray = extractProcessArray(answer);
      if (processArray) {
        onProcessesDetected?.(processArray);
      }
      
      // 再检查是否有mermaid数据
      const mermaidData = extractMermaidData(answer);
      if (mermaidData) {
        onMermaidData?.(mermaidData);
      }

      // 处理消息显示
      const processedAnswer = answer.replace(/```mermaid\s*([\s\S]*?)\s*```/g, 
        () => '【mermaid流程图数据-点击复制-点击渲染】')
        .replace(/```/g, ''); // 移除其他可能的代码块标记

      const aiMessage = {
        type: 'ai',
        content: processedAnswer,
        mermaidData: mermaidData
      };

      setMessages(prev => prev.slice(0, -1).concat([aiMessage]));
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages(prev => prev.slice(0, -1).concat([{
        type: 'ai',
        content: '抱歉，发生了一些错误，请稍后重试。'
      }]));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const MessageContent = ({ message }) => {
    if (message.type === 'thinking') {
      return (
        <div className={`${styles.messageContent} ${styles.thinkingMessage}`}>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
        </div>
      );
    }

    if (message.content.startsWith('提交问卷\n')) {
      return (
        <div className={`${styles.messageContent} ${styles.formSubmission}`}>
          问卷提交成功
        </div>
      );
    }

    // 检查是否包含特殊文本块
    const specialBlock = message.type === 'ai' ? extractSpecialBlock(message.content) : null;
    
    if (specialBlock) {
      // 替换原始内容中的特殊块
      const parts = message.content.split(specialBlock.fullMatch);
      
      return (
        <div className={styles.messageContent}>
          {parts[0] && (
            <span dangerouslySetInnerHTML={{ 
              __html: parts[0]
                .split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .join('<br/>')
            }} />
          )}
          <div 
            className={styles.downloadBlock}
            onClick={() => downloadMarkdown(specialBlock.fileName, specialBlock.content)}
          >
            {specialBlock.fileName}-点击下载
          </div>
          {parts[1] && (
            <span dangerouslySetInnerHTML={{ 
              __html: parts[1]
                .split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .join('<br/>')
            }} />
          )}
        </div>
      );
    }

    const parts = message.content.split('【mermaid流程图数据-点击复制-点击渲染】');
    
    return (
      <div className={styles.messageContent}>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            <span dangerouslySetInnerHTML={{ 
              __html: part
                .split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .join('<br/>')
            }} />
            {i < parts.length - 1 && message.mermaidData && (
              <span 
                className={styles.mermaidCopy}
                onClick={() => handleCopyAndRender(message.mermaidData)}
              >
                【mermaid流程图数据-点击复制-点击渲染】
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  if (!visible) return null;

  return (
    <div className={`${styles.dialogOverlay} ${isMobile ? styles.mobile : ''}`}>
      <div 
        ref={dialogRef}
        className={`${styles.dialogContainer} ${isDragging ? styles.dragging : ''}`}
        style={position ? {
          left: `${position.x}px`,
          top: `${position.y}px`
        } : undefined}
      >
        <div 
          className={styles.dialogHeader}
          onMouseDown={handleMouseDown}
        >
          <h2>北航器件制备工艺智能助手</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.messageContainer}>
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`${styles.messageWrapper} ${
                message.type === 'user' ? styles.userMessage : styles.aiMessage
              }`}
            >
              <div className={styles.avatar}>
                <img 
                  src={message.type === 'user' ? '/user.svg' : '/ai.svg'} 
                  alt={message.type === 'user' ? 'User' : 'AI'} 
                />
              </div>
              <MessageContent message={message} />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputContainer}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isLoading ? "AI正在思考中..." : "请输入您的问题..."}
            className={styles.input}
            disabled={isLoading}
          />
          <button 
            className={`${styles.sendButton} ${isLoading ? styles.loading : ''}`}
            onClick={handleSend}
            disabled={isLoading}
          >
            <img src="/send.svg" alt="发送" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default ChatDialog; 