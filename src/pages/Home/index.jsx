import React, { useState, useRef } from 'react';
import MermaidDiagram from '../../components/MermaidDiagram';
import ChatDialog from '../../components/ChatDialog';
import ProcessForm from '../../components/ProcessForm';
import styles from './index.module.scss';

const defaultMermaidData = `graph TD
    A[请点击输入您想制备的器件]`;

const Home = () => {
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [mermaidData, setMermaidData] = useState(defaultMermaidData);
  const [currentChartData, setCurrentChartData] = useState(defaultMermaidData);
  const [detectedProcesses, setDetectedProcesses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formCompleted, setFormCompleted] = useState(false);
  const chatDialogRef = useRef();
  const [shouldResetView, setShouldResetView] = useState(false);

  // 只切换对话框的显示状态，不重置对话内容
  const toggleChat = () => {
    setIsChatVisible(!isChatVisible);
  };

  // 切换表单显示状态
  const toggleForm = () => {
    if (!formCompleted) {
      setShowForm(!showForm);
    }
  };

  // 发送当前流程图数据到AI对话
  const handleSendCurrentChart = () => {
    if (chatDialogRef.current && currentChartData) {
      setIsChatVisible(true);
      chatDialogRef.current.sendMessage(`\`\`\`mermaid\n${currentChartData}\n\`\`\``);
    }
  };

  // 处理从AI返回的流程图数据
  const handleMermaidData = (data, reset = false) => {
    if (data) {
      if (data.trim() === mermaidData.trim() && !reset) {
        setMermaidData(data.trim() + `\n%% Rerender: ${Date.now()}`);
      } else {
        setMermaidData(data.trim());
      }
      setShouldResetView(reset);
    }
  };

  // 处理图表数据更新
  const handleChartDataChange = (data) => {
    setCurrentChartData(data);
  };

  // 处理AI返回的工艺流程数组
  const handleProcessesDetected = (processes) => {
    if (Array.isArray(processes) && processes.length > 0) {
      setDetectedProcesses(processes);
      setShowForm(true);
      setFormCompleted(false);
    }
  };

  // 处理表单完成
  const handleFormComplete = (results) => {
    console.log('表单结果:', results);
    setFormCompleted(true);
    // 0.5秒后关闭表单并重置状态
    setTimeout(() => {
      setShowForm(false);
      setDetectedProcesses([]);
    }, 500);
  };

  // 重置对话
  const handleResetChat = () => {
    chatDialogRef.current?.resetChat();
    setMermaidData(defaultMermaidData);
    setCurrentChartData(defaultMermaidData);
    setShouldResetView(true);
    setDetectedProcesses([]);
    setShowForm(false);
    setFormCompleted(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>北航实验室仪器制备方案</h1>
        <h2>北航器件制备工艺智能助手</h2>
      </header>
      
      <div className={styles.content}>
        <div className={styles.diagramContainer}>
          <MermaidDiagram 
            chart={mermaidData} 
            shouldResetView={shouldResetView}
            onViewReset={() => setShouldResetView(false)}
            onChartDataChange={handleChartDataChange}
          />
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerButtons}>
          <button 
            className={`${styles.footerButton} ${styles.sendButton}`}
            onClick={handleSendCurrentChart}
          >
            发送当前方案
          </button>
          <button 
            className={`${styles.footerButton} ${styles.resetButton}`}
            onClick={handleResetChat}
          >
            开始新对话
          </button>
          <button 
            className={`${styles.footerButton} ${styles.aiButton}`}
            onClick={toggleChat}
          >
            AI对话
          </button>
        </div>
        <div className={styles.footerContent}>
          <span className={styles.copyright}>© 2025 北京航空航天大学 - 实验室仪器制备方案</span>
        </div>
      </footer>

      <ChatDialog 
        ref={chatDialogRef}
        visible={isChatVisible}
        onClose={toggleChat}
        onMermaidData={handleMermaidData}
        onProcessesDetected={handleProcessesDetected}
      />

      {detectedProcesses.length > 0 && (
        <>
          <ProcessForm 
            processes={detectedProcesses}
            onComplete={handleFormComplete}
            visible={showForm}
            onClose={toggleForm}
            chatDialogRef={chatDialogRef}
          />
          {!showForm && !formCompleted && (
            <button className={styles.formTrigger} onClick={toggleForm}>
              <img src="/form.svg" alt="打开表单" />
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Home; 