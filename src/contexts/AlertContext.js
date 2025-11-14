// src/contexts/AlertContext.js

import React, { createContext, useState, useContext } from 'react';
import CustomAlert from '../components/CustomAlert';
import { useTheme } from './ThemeContext';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export function AlertProvider({ children }) {
  const { theme } = useTheme();
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [],
    icon: null,
  });

  const showAlert = ({
    title,
    message,
    type = 'info',
    buttons = [],
    icon,
  }) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      buttons,
      icon,
    });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  // Helper functions for common alerts
  const showSuccess = (title, message, onOk) => {
    showAlert({
      title,
      message,
      type: 'success',
      buttons: [{ text: 'OK', style: 'primary', onPress: onOk }],
    });
  };

  const showError = (title, message, onOk) => {
    showAlert({
      title,
      message,
      type: 'error',
      buttons: [{ text: 'OK', style: 'primary', onPress: onOk }],
    });
  };

  const showConfirm = (title, message, onConfirm, onCancel) => {
    showAlert({
      title,
      message,
      type: 'confirm',
      buttons: [
        { text: 'Cancel', style: 'secondary', onPress: onCancel },
        { text: 'Confirm', style: 'primary', onPress: onConfirm },
      ],
    });
  };

  return (
    <AlertContext.Provider
      value={{ showAlert, hideAlert, showSuccess, showError, showConfirm }}
    >
      {children}
      <CustomAlert
        {...alertConfig}
        onClose={hideAlert}
        theme={theme}
      />
    </AlertContext.Provider>
  );
}
