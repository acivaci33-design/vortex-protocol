/**
 * VORTEX Protocol - Connection Status Indicator
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { connectionManager, type ConnectionStatus as Status } from '../../services/p2p';
import { cn } from '../../lib/utils';

export function ConnectionStatus() {
  const [status, setStatus] = useState<Status>(connectionManager.getStatus());
  const [showTooltip, setShowTooltip] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const handleStatusChange = (newStatus: Status) => {
      setStatus(newStatus);
    };

    const handleRegistered = ({ onlineCount }: { onlineCount: number }) => {
      setOnlineCount(onlineCount);
    };

    connectionManager.on('status-change', handleStatusChange);
    connectionManager.on('registered', handleRegistered);

    return () => {
      connectionManager.off('status-change', handleStatusChange);
      connectionManager.off('registered', handleRegistered);
    };
  }, []);

  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-success',
      bgColor: 'bg-success/10',
      label: 'Connected',
    },
    connecting: {
      icon: Loader2,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      label: 'Connecting...',
    },
    reconnecting: {
      icon: Loader2,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      label: 'Reconnecting...',
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-danger',
      bgColor: 'bg-danger/10',
      label: 'Disconnected',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimating = status === 'connecting' || status === 'reconnecting';

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        className={cn(
          'p-2 rounded-lg transition-colors',
          config.bgColor,
          config.color
        )}
        onClick={() => {
          if (status === 'disconnected') {
            connectionManager.connect().catch(console.error);
          }
        }}
        title={config.label}
      >
        <Icon 
          size={18} 
          className={isAnimating ? 'animate-spin' : ''} 
        />
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full right-0 mt-2 px-3 py-2 bg-surface-2 border border-border rounded-lg shadow-lg z-50 whitespace-nowrap"
          >
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', 
                status === 'connected' ? 'bg-success' : 
                status === 'disconnected' ? 'bg-danger' : 'bg-warning'
              )} />
              <span className="text-sm text-text-primary">{config.label}</span>
            </div>
            {status === 'connected' && onlineCount > 0 && (
              <p className="text-xs text-text-muted mt-1">
                {onlineCount} users online
              </p>
            )}
            {status === 'disconnected' && (
              <p className="text-xs text-text-muted mt-1">
                Click to reconnect
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
