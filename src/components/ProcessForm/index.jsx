import React, { useState, useEffect } from 'react';
import styles from './index.module.scss';

const ProcessForm = ({ processes, onComplete, visible, onClose, chatDialogRef }) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [currentProcess, setCurrentProcess] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [history, setHistory] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [processResults, setProcessResults] = useState({});
  const [showCompletion, setShowCompletion] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [result, setResult] = useState('');

  // 监听工艺流程数组变化
  useEffect(() => {
    if (processes.length > 0 && formData) {
      // 重置所有状态
      setCurrentProcess(processes[0]);
      setCurrentPath([processes[0]]);
      setSelectedOption('');
      setHistory([]);
      setShowCompletion(false);
      setProcessResults({});
      setDebugInfo('');
      
      // 重新初始化第一个问题
      initializeQuestion(processes[0], formData);
    }
  }, [processes, formData]);

  // 加载表单数据
  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/表单.json');
        const data = await response.json();
        setFormData(data);
        
        if (processes.length > 0) {
          setCurrentProcess(processes[0]);
          initializeQuestion(processes[0], data);
        }
      } catch (error) {
        console.error('加载表单数据失败:', error);
        setDebugInfo('加载表单数据失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  // 初始化问题
  const initializeQuestion = (process, data) => {
    if (!data || !data[process]) {
      setDebugInfo(`未找到工艺 ${process} 的问题数据`);
      return;
    }
    
    const firstQuestion = data[process].find(q => q.id === 'Q1');
    if (firstQuestion) {
      setCurrentQuestion(firstQuestion);
      setCurrentPath([process, 'Q1']);
      setSelectedOption('');
    } else {
      setDebugInfo(`未找到工艺 ${process} 的初始问题`);
    }
  };

  // 选择工艺流程
  const selectProcess = (process) => {
    setCurrentProcess(process);
    initializeQuestion(process, formData);
  };

  // 处理提交完成
  const handleSubmit = () => {
    try {
      setShowCompletion(true);
      
      // 构建提交数据
      const formattedResults = Object.entries(processResults)
        .map(([process, result]) => `${process}: ${result}`)
        .join('\n');

      // 发送数据到AI聊天
      if (chatDialogRef?.current) {
        chatDialogRef.current.sendMessage(`提交问卷\n${formattedResults}`);
      }
      
      // 延迟关闭并调用完成回调
      setTimeout(() => {
        onComplete?.(processResults);
        setShowCompletion(false);
        // 重置所有状态
        setCurrentProcess('');
        setCurrentQuestion(null);
        setSelectedOption('');
        setProcessResults({});
        setCurrentPath([]);
        setHistory([]);
      }, 500);
    } catch (error) {
      console.error('提交失败:', error);
      setDebugInfo('提交失败，请重试');
    }
  };

  // 选择选项
  const handleOptionSelect = (optionText, option) => {
    setSelectedOption(optionText);

    // 保存历史记录
    setHistory(prev => [...prev, {
      process: currentProcess,
      questionId: currentQuestion.id,
      question: currentQuestion,
      selectedOption: optionText
    }]);

    // 处理结果
    if (option.output) {
      setResult(option.output); // 设置当前推荐方案
      setProcessResults(prev => ({
        ...prev,
        [currentProcess]: option.output
      }));

      // 如果还有其他流程，切换到下一个
      const currentIndex = processes.indexOf(currentProcess);
      if (currentIndex < processes.length - 1) {
        const nextProcess = processes[currentIndex + 1];
        setCurrentProcess(nextProcess);
        initializeQuestion(nextProcess, formData);
        setResult(''); // 清空当前推荐方案
      } else {
        // 所有流程完成，显示提交按钮
        setCurrentQuestion({
          id: 'submit',
          question: '您已完成所有问题，请点击提交按钮完成问卷。',
          options: {
            '提交': { submit: true }
          }
        });
      }
    } else if (option.submit) {
      handleSubmit();
    } else if (option.next) {
      // 跳转到下一个问题
      const nextQuestion = formData[currentProcess].find(q => q.id === option.next);
      if (nextQuestion) {
        setCurrentQuestion(nextQuestion);
        setCurrentPath(prev => [...prev, option.next]);
        setSelectedOption('');
        setResult(''); // 清空当前推荐方案，因为还没到最终结果
      } else {
        setDebugInfo(`未找到下一个问题: ${option.next}`);
      }
    }
  };

  // 返回上一步
  const handleBack = () => {
    if (history.length > 0) {
      const prevState = history[history.length - 1];
      setCurrentProcess(prevState.process);
      setCurrentQuestion(prevState.question);
      setSelectedOption('');
      setCurrentPath(prev => prev.slice(0, -1));
      setHistory(prev => prev.slice(0, -1));
    }
  };

  // 检查是否所有流程都已完成
  const allProcessesCompleted = processes.every(process => processResults[process]);

  if (!visible) return null;

  return (
    <div className={styles.formOverlay} onClick={onClose}>
      <div className={styles.formContainer} onClick={e => e.stopPropagation()}>
        <div className={styles.formHeader}>
          <h3>工艺流程问卷</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.formContent}>
          {loading ? (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
            </div>
          ) : showCompletion ? (
            <div className={styles.completionCard}>
              <div className={styles.completionIcon}>✨</div>
              <h3>问卷提交成功！</h3>
            </div>
          ) : processes.length > 0 ? (
            <>
              {processes.length > 1 && (
                <div className={styles.processNav}>
                  {processes.map(process => (
                    <button
                      key={process}
                      className={`${styles.processBtn} ${currentProcess === process ? styles.active : ''}`}
                      onClick={() => selectProcess(process)}
                    >
                      {process}
                    </button>
                  ))}
                </div>
              )}

              {currentPath.length > 0 && (
                <div className={styles.processPath}>
                  {currentPath.map((step, index) => (
                    <span key={index} className={styles.pathItem}>
                      {step}
                    </span>
                  ))}
                </div>
              )}

              {currentQuestion && (
                <div className={styles.questionCard}>
                  <h3>{currentQuestion.question}</h3>
                  <div className={styles.options}>
                    {Object.entries(currentQuestion.options).map(([text, option]) => (
                      <button
                        key={text}
                        className={`${styles.optionButton} ${selectedOption === text ? styles.selected : ''}`}
                        onClick={() => handleOptionSelect(text, option)}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 添加当前推荐方案显示 */}
              {result && (
                <div className={styles.resultCard}>
                  <h4>推荐方案</h4>
                  <p>{result}</p>
                </div>
              )}

              {/* 已选择的所有方案 */}
              {Object.keys(processResults).length > 0 && currentQuestion?.id === 'submit' && (
                <div className={styles.resultCard}>
                  <h4>已选择的方案</h4>
                  {Object.entries(processResults).map(([process, result]) => (
                    <p key={process}>{process}: {result}</p>
                  ))}
                </div>
              )}

              <div className={styles.controls}>
                {history.length > 0 && !currentQuestion?.options['提交'] && (
                  <button className={styles.backButton} onClick={handleBack}>
                    返回上一步
                  </button>
                )}
                {allProcessesCompleted && (
                  <button 
                    className={styles.submitButton}
                    onClick={handleSubmit}
                  >
                    提交问卷
                  </button>
                )}
              </div>

              {debugInfo && (
                <div className={styles.debugInfo}>
                  {debugInfo}
                </div>
              )}
            </>
          ) : (
            <div className={styles.loadingMessage}>
              <h3>请稍等，正在渲染工艺流程问卷</h3>
              <p>请稍等...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessForm; 