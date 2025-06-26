import React, { useState, useRef, useEffect } from 'react';
import styles from './index.module.scss';

const Modal = ({ isOpen, onClose, title, content, onTitleChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => {
    setEditedTitle(title);
    setIsEditing(false);
  }, [title, isOpen]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleConfirm = () => {
    if (editedTitle.trim() && editedTitle !== title) {
      onTitleChange?.(editedTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedTitle(title);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setEditedTitle(title);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modal} onClick={handleClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleContainer}>
            {isEditing ? (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.titleInput}
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button className={styles.confirmButton} onClick={handleConfirm}>
                  确定
                </button>
              </>
            ) : (
              <>
                <h3 className={styles.title}>{title}</h3>
                <img
                  src="/change.svg"
                  alt="编辑"
                  className={styles.editIcon}
                  onClick={() => setIsEditing(true)}
                />
              </>
            )}
          </div>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
        </div>
        <div className={styles.modalBody}>{content}</div>
      </div>
    </div>
  );
};

export default Modal; 