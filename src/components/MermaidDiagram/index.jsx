import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import styles from './index.module.scss';
import Modal from '../Modal';

// 初始化 mermaid 配置
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '16px',  // 减小基础字体
    primaryTextColor: '#2c3e50',
    lineColor: '#34495e',
  },
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: 'basis',
    rankSpacing: 15,  // 最小层级间距
    nodeSpacing: 15,  // 最小节点间距
    padding: 5,       // 最小内边距
  },
});

// 添加自定义样式
const getCustomStyles = (chart) => {
  // 检查是否已经包含图表类型声明
  const diagramType = chart.trim().startsWith('graph') ? '' : 'graph TD\n';
  
  return `%%{init: {'theme': 'base'}}%%
${diagramType}${chart}

%% 应用样式到所有节点
classDef default fill:#e3f2fd,stroke:#1976d2,color:#1976d2,stroke-width:1px;

%% 主节点样式 - 第一个A节点
classDef mainNode fill:#0288d1,stroke:#0277bd,color:#ffffff,stroke-width:2px;

%% 自动应用样式
class A mainNode;
`;
};

const MermaidDiagram = ({ chart: initialChart, shouldResetView = false, onViewReset, onChartDataChange }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const lastTouchDistance = useRef(null);
  const rafId = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(50);
  const [currentNode, setCurrentNode] = useState(null);
  const [chartData, setChartData] = useState(initialChart);
  
  // 添加鼠标位置追踪
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const initialMousePositionRef = useRef({ x: 0, y: 0 });
  
  // 当chartData更新时通知父组件
  useEffect(() => {
    onChartDataChange?.(chartData);
  }, [chartData]);

  // 打印流程图数据
  useEffect(() => {
    console.log('流程图原始数据:', chartData);
    // 解析并打印节点关系
    const lines = chartData.split('\n');
    const connections = lines
      .filter(line => line.includes('-->'))
      .map(line => {
        const [source, target] = line.split('-->').map(part => part.trim());
        return { source, target };
      });
    console.log('节点连接关系:', connections);
  }, [chartData]);

  const transformRef = useRef({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const lastWheelTime = useRef(0);
  const accumulatedDelta = useRef(0);

  // 添加Modal状态
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    content: ''
  });

  // 更新流程图数据的函数
  const updateChartData = (nodeId, newTitle) => {
    const lines = chartData.split('\n');
    let updated = false;

    const updatedLines = lines.map(line => {
      // 匹配完整的节点定义，包括可能的方括号内的文本
      const nodePattern = new RegExp(`(${nodeId})\\[([^\\]]+)\\]`);
      const match = line.match(nodePattern);
      
      if (match) {
        updated = true;
        // 保持原有的格式，只替换文本内容
        return line.replace(match[0], `${nodeId}[${newTitle}]`);
      }
      return line;
    });

    if (updated) {
      const newChartData = updatedLines.join('\n');
      setChartData(newChartData);
      return newChartData;
    }
    return chartData;
  };

  // 处理节点标题更改
  const handleTitleChange = (newTitle) => {
    if (!currentNode) return;
    
    const nodeElement = document.getElementById(currentNode.id);
    if (nodeElement) {
      const labelElement = nodeElement.querySelector('.nodeLabel');
      if (labelElement) {
        // 更新节点文本
        labelElement.textContent = newTitle;
        
        // 更新弹窗状态
        setModalState(prev => ({
          ...prev,
          title: newTitle
        }));

        // 获取当前节点的ID
        const nodeId = currentNode.id.replace('flowchart-', '').split('-')[0];
        
        // 更新流程图数据并重新渲染
        const updatedChart = updateChartData(nodeId, newTitle);
        renderDiagram(updatedChart);

        // 延迟一小段时间后自动重置视图
        setTimeout(() => {
          setZoomLevel(10);
          renderDiagram(updatedChart);
        }, 100);
      }
    }
  };

  // 修改节点点击事件处理
  const handleNodeClick = (event) => {
    // 计算鼠标移动距离
    const dx = mousePositionRef.current.x - initialMousePositionRef.current.x;
    const dy = mousePositionRef.current.y - initialMousePositionRef.current.y;
    const moveDistance = Math.sqrt(dx * dx + dy * dy);
    
    // 如果移动距离大于阈值（例如5像素），则不触发点击事件
    if (moveDistance > 5) {
      return;
    }

    const node = event.target.closest('.node');
    if (!node) return;

    // 保存当前节点信息
    setCurrentNode({
      id: node.id,
      element: node
    });

    const nodeLabel = node.querySelector('.nodeLabel');
    if (nodeLabel) {
      const currentNodeText = nodeLabel.textContent?.trim() || '未知节点';
      
      const lines = chartData.split('\n');
      const connections = lines
        .filter(line => line.includes('-->'))
        .map(line => {
          const [source, target] = line.split('-->').map(part => {
            const id = part.trim().split(/[\[\{]/)[0].trim();
            return id;
          });
          return { source, target };
        });
      
      const nodeId = node.id.replace('flowchart-', '').split('-')[0];
      console.log('当前节点ID:', nodeId);
      
      const pathIds = [];
      let currentId = nodeId;
      
      const findParentPath = (id) => {
        const connection = connections.find(conn => {
          const targetId = conn.target.split(/[\[\{]/)[0].trim();
          return targetId === id;
        });
        
        if (connection) {
          const sourceId = connection.source;
          pathIds.unshift(sourceId);
          findParentPath(sourceId);
        }
      };
      
      findParentPath(currentId);
      pathIds.push(currentId);
      
      console.log('找到的路径:', pathIds);
      
      const flowPath = pathIds
        .map(id => {
          const nodes = document.querySelectorAll('.node');
          for (const n of nodes) {
            const nodeId = n.id.replace('flowchart-', '').split('-')[0];
            if (nodeId === id) {
              return n.querySelector('.nodeLabel')?.textContent?.trim();
            }
          }
          return null;
        })
        .filter(text => text)
        .join(' → ');
      
      console.log('最终显示文本:', flowPath);
      
      setModalState({
        isOpen: true,
        title: currentNodeText,
        content: `当前路径：\n${flowPath}`
      });
    }
  };

  // 更新变换状态和样式
  const updateTransform = (newTransform, withTransition = false) => {
    transformRef.current = newTransform;

    if (svgRef.current) {
      if (withTransition) {
        svgRef.current.style.transition = 'transform 0.05s ease-out';
      } else {
        svgRef.current.style.transition = 'none';
      }
      
      svgRef.current.style.transform = `translate(${newTransform.translateX}px, ${newTransform.translateY}px) scale(${newTransform.scale})`;
    }
  };

  const handleZoom = (zoomIn) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const scaleFactor = zoomIn ? 1.2 : 0.8;
    const newScale = transformRef.current.scale * scaleFactor;
    const clampedScale = Math.min(Math.max(newScale, 0.1), 5);

    if (clampedScale === transformRef.current.scale) return;

    // 更新滑动条的值
    const newZoomLevel = ((clampedScale - 0.1) / 4.9) * 100;
    setZoomLevel(Math.round(newZoomLevel));

    const x = (centerX - transformRef.current.translateX) / transformRef.current.scale;
    const y = (centerY - transformRef.current.translateY) / transformRef.current.scale;

    const newTransform = {
      scale: clampedScale,
      translateX: centerX - x * clampedScale,
      translateY: centerY - y * clampedScale,
    };

    updateTransform(newTransform, true);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    
    const container = containerRef.current;
    const svg = container?.querySelector('svg');
    if (!container || !svg) return;

    const currentTime = Date.now();
    if (currentTime - lastWheelTime.current > 200) {
      accumulatedDelta.current = 0;
    }
    lastWheelTime.current = currentTime;

    accumulatedDelta.current += e.deltaY;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const sensitivity = 0.002;
    const scaleFactor = Math.exp(-accumulatedDelta.current * sensitivity);
    const newScale = transformRef.current.scale * scaleFactor;
    const clampedScale = Math.min(Math.max(newScale, 0.1), 5);
    
    if (clampedScale === 0.1 || clampedScale === 5) {
      accumulatedDelta.current = 0;
    }

    // 更新滑动条的值
    const newZoomLevel = ((clampedScale - 0.1) / 4.9) * 100;
    setZoomLevel(Math.round(newZoomLevel));

    const x = (mouseX - transformRef.current.translateX) / transformRef.current.scale;
    const y = (mouseY - transformRef.current.translateY) / transformRef.current.scale;
    
    const newTransform = {
      scale: clampedScale,
      translateX: mouseX - x * clampedScale,
      translateY: mouseY - y * clampedScale,
    };

    requestAnimationFrame(() => {
      updateTransform(newTransform, true);
    });
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - transformRef.current.translateX,
        y: e.clientY - transformRef.current.translateY,
      });
      // 记录初始鼠标位置
      initialMousePositionRef.current = { x: e.clientX, y: e.clientY };
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
      updateTransform(transformRef.current, false);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      // 更新当前鼠标位置
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
      const newTransform = {
        ...transformRef.current,
        translateX: e.clientX - dragStart.x,
        translateY: e.clientY - dragStart.y,
      };
      
      requestAnimationFrame(() => {
        updateTransform(newTransform, false);
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 添加触摸事件处理
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      lastTouchDistance.current = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - transformRef.current.translateX,
        y: e.touches[0].clientY - transformRef.current.translateY,
      });
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault(); // 阻止默认滚动
    
    if (isPinching && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      if (lastTouchDistance.current !== null) {
        const scale = currentDistance / lastTouchDistance.current;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        
        // 计算两个触摸点的中心
        const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
        const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;

        const newScale = transformRef.current.scale * scale;
        const clampedScale = Math.min(Math.max(newScale, 0.1), 5);

        const x = (centerX - transformRef.current.translateX) / transformRef.current.scale;
        const y = (centerY - transformRef.current.translateY) / transformRef.current.scale;

        const newTransform = {
          scale: clampedScale,
          translateX: centerX - x * clampedScale,
          translateY: centerY - y * clampedScale,
        };

        // 使用 requestAnimationFrame 优化渲染
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
        
        rafId.current = requestAnimationFrame(() => {
          updateTransform(newTransform, false);
        });
      }

      lastTouchDistance.current = currentDistance;
    } else if (isDragging && e.touches.length === 1) {
      const newTransform = {
        ...transformRef.current,
        translateX: e.touches[0].clientX - dragStart.x,
        translateY: e.touches[0].clientY - dragStart.y,
      };

      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        updateTransform(newTransform, false);
      });
    }
  };

  const handleTouchEnd = () => {
    setIsPinching(false);
    setIsDragging(false);
    lastTouchDistance.current = null;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
  };

  const renderDiagram = async (updatedChart) => {
    if (!containerRef.current) return;
    
    try {
      // 清除现有的SVG内容
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }

      const enhancedChart = getCustomStyles(updatedChart || chartData);
      const { svg } = await mermaid.render('mermaid-diagram-' + Date.now(), enhancedChart);
      
      const svgContainer = document.createElement('div');
      svgContainer.innerHTML = svg;
      svgContainer.style.position = 'absolute';
      svgContainer.style.left = '0';
      svgContainer.style.top = '0';
      svgContainer.style.transformOrigin = '0 0';
      
      // 添加全局样式
      const style = document.createElement('style');
      style.textContent = `
        #mermaid-diagram {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
        .node {
          cursor: pointer;
          transition: filter 0.3s ease;
        }
        .node rect, .node circle, .node polygon, .node path {
          filter: drop-shadow(0 1px 1px rgba(0,0,0,0.05));
          transition: filter 0.3s ease;
        }
        .node:hover rect, .node:hover circle, .node:hover polygon, .node:hover path {
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));
        }
        .node.process:hover rect {
          filter: drop-shadow(0 4px 8px rgba(44, 62, 80, 0.25));
        }
        .node.condition:hover polygon {
          filter: drop-shadow(0 4px 8px rgba(94, 53, 177, 0.25));
        }
        .node.io:hover rect {
          filter: drop-shadow(0 4px 8px rgba(2, 136, 209, 0.25));
        }
        .node.note:hover rect {
          filter: drop-shadow(0 4px 8px rgba(25, 118, 210, 0.25));
        }
        .node text {
          font-size: 12px !important;
          font-weight: 500 !important;
          pointer-events: none;
        }
        .edgeLabel {
          background-color: white !important;
          padding: 1px 4px !important;
          border-radius: 3px !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          box-shadow: 0 1px 1px rgba(0,0,0,0.05) !important;
        }
        .edgeLabel foreignObject {
          text-align: center;
        }
        .node.default rect { rx: 8px; }
        .node.condition polygon { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1)); }
        .node.io rect { rx: 16px; }
        .node.start-end circle { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1)); }
        .edgePath path {
          stroke-width: 2px;
        }
        .edgePath .path {
          stroke: #34495e !important;
        }
      `;
      svgContainer.appendChild(style);
      
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      
      containerRef.current.appendChild(svgContainer);
      svgRef.current = svgContainer;

      // 添加节点点击事件监听
      const nodes = svgContainer.querySelectorAll('.node');
      nodes.forEach(node => {
        node.addEventListener('click', handleNodeClick);
      });
      
      const svgElement = svgContainer.querySelector('svg');
      if (svgElement) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const svgRect = svgElement.getBoundingClientRect();
        
        const scaleX = containerRect.width / svgRect.width;
        const scaleY = containerRect.height / svgRect.height;
        const initialScale = Math.min(scaleX, scaleY) * 0.9;
        
        const newTransform = {
          scale: initialScale,
          translateX: (containerRect.width - svgRect.width * initialScale) / 2,
          translateY: (containerRect.height - svgRect.height * initialScale) / 2,
        };
        
        updateTransform(newTransform, true);
      }
      
      setIsReady(true);
    } catch (error) {
      console.error('Mermaid rendering error:', error);
    }
  };

  // 初始化和更新时的副作用
  useEffect(() => {
    setChartData(initialChart);
  }, [initialChart]);

  useEffect(() => {
    if (shouldResetView) {
      resetView(chartData);
      onViewReset?.();
    }
  }, [shouldResetView, chartData]);

  useEffect(() => {
    renderDiagram();
  }, [chartData]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (isReady) {
        renderDiagram();
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [isDragging, isPinching, dragStart]);

  const resetView = (chart) => {
    setZoomLevel(10); // 重置滑动条到最左边位置
    renderDiagram(chart);
  };

  const handleZoomSliderChange = (event) => {
    const value = parseInt(event.target.value);
    setZoomLevel(value);
    
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newScale = 0.1 + (value / 100) * 4.9;
    const clampedScale = Math.min(Math.max(newScale, 0.1), 5);

    if (clampedScale === transformRef.current.scale) return;

    const x = (centerX - transformRef.current.translateX) / transformRef.current.scale;
    const y = (centerY - transformRef.current.translateY) / transformRef.current.scale;

    const newTransform = {
      scale: clampedScale,
      translateX: centerX - x * clampedScale,
      translateY: centerY - y * clampedScale,
    };

    updateTransform(newTransform, true);
  };

  // 添加导出图片功能
  const handleExport = () => {
    const container = containerRef.current;
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    try {
      // 深度克隆 SVG
      const clonedSvg = svg.cloneNode(true);
      
      // 获取计算后的样式并应用到克隆的 SVG 元素
      const applyComputedStyles = (sourceNode, targetNode) => {
        if (sourceNode.nodeType === 1) { // 元素节点
          const computedStyle = window.getComputedStyle(sourceNode);
          const importantStyles = [
            'fill',
            'stroke',
            'stroke-width',
            'opacity',
            'font-family',
            'font-size',
            'font-weight',
            'text-anchor',
            'dominant-baseline',
            'color'
          ];
          
          importantStyles.forEach(style => {
            const value = computedStyle.getPropertyValue(style);
            if (value) {
              targetNode.style[style] = value;
            }
          });
          
          // 递归处理子节点
          Array.from(sourceNode.children).forEach((child, index) => {
            if (targetNode.children[index]) {
              applyComputedStyles(child, targetNode.children[index]);
            }
          });
        }
      };

      // 应用样式
      applyComputedStyles(svg, clonedSvg);
      
      // 获取 SVG 的尺寸和视图框
      const bbox = svg.getBBox();
      const viewBox = [
        bbox.x,
        bbox.y,
        bbox.width,
        bbox.height
      ].join(' ');
      
      // 设置克隆 SVG 的属性
      clonedSvg.setAttribute('viewBox', viewBox);
      clonedSvg.setAttribute('width', bbox.width * 2);
      clonedSvg.setAttribute('height', bbox.height * 2);
      
      // 添加白色背景
      const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      background.setAttribute('width', '100%');
      background.setAttribute('height', '100%');
      background.setAttribute('fill', '#FFFFFF');
      clonedSvg.insertBefore(background, clonedSvg.firstChild);

      // 确保所有默认样式都被应用
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        .node rect { fill: #fff; }
        .node text { fill: #000; }
        .node .label { fill: #000; }
        .edgePath path { stroke: #333; }
        .edgeLabel { color: #000; }
        .cluster rect { fill: #fff; }
      `;
      clonedSvg.insertBefore(styleSheet, clonedSvg.firstChild);

      // 将 SVG 转换为字符串，并添加XML声明
      const svgData = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
                     '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
                     new XMLSerializer().serializeToString(clonedSvg);
      
      // 创建 Blob
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      // 创建下载链接
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flowchart.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出图片时出错:', error);
    }
  };

  return (
    <div className={styles.container}>
      <div 
        className={styles.diagram} 
        ref={containerRef}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />
      <div className={styles.controls}>
        <button className={styles.zoomButton} onClick={() => handleZoom(false)}>−</button>
        <div className={styles.zoomSliderContainer}>
          <input
            type="range"
            min="0"
            max="100"
            value={zoomLevel}
            onChange={handleZoomSliderChange}
          />
        </div>
        <button className={styles.zoomButton} onClick={() => handleZoom(true)}>+</button>
        <button onClick={() => resetView(chartData)}>重置视图</button>
        <button className={styles.exportButton} onClick={handleExport}>导出图片</button>
      </div>
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          setCurrentNode(null);
        }}
        title={modalState.title}
        content={modalState.content}
        onTitleChange={handleTitleChange}
      />
    </div>
  );
};

export default MermaidDiagram; 