import { useEffect, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

export const useSignalR = (
  classroomId: string, 
  token: string | null, 
  onUserStatusChanged?: (userId: string, isOnline: boolean) => void,
  initialMessages: { user: string, text: string, isTeacher?: boolean, userId?: string, isFile?: boolean, fileName?: string, fileUrl?: string, isAdmin?: boolean }[] = [],
  onVideoCallStatusChanged?: (isActive: boolean) => void,
  onKicked?: (roomId: string) => void
) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [messages, setMessages] = useState<{ user: string, text: string, isTeacher?: boolean, userId?: string, isFile?: boolean, fileName?: string, fileUrl?: string, isAdmin?: boolean }[]>([]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!token) return;

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`/chatHub?access_token=${token}`)
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, [token]);

  useEffect(() => {
    if (connection && classroomId) {
      connection.start()
        .then(() => {
          console.log("SignalR: Connection started. Joining classroom:", classroomId);
          connection.invoke('JoinClassroom', classroomId);
          
          connection.on('ReceiveMessage', (user: string, text: string, isTeacher?: boolean, userId?: string, isFile?: boolean, fileName?: string, fileUrl?: string, isAdmin?: boolean) => {
            setMessages(prev => [...prev, { user, text, isTeacher, userId, isFile, fileName, fileUrl, isAdmin }]);
          });

          connection.on('UserStatusChanged', (userId: string, isOnline: boolean) => {
            if (onUserStatusChanged) {
              onUserStatusChanged(userId, isOnline);
            }
          });

          connection.on('VideoCallStatusChanged', (isActive: boolean) => {
            if (onVideoCallStatusChanged) {
              onVideoCallStatusChanged(isActive);
            }
          });

          connection.on('KickedFromRoom', (roomId: string) => {
            if (onKicked) {
              onKicked(roomId);
            }
          });
        })
        .catch(e => console.error('SignalR: Connection failed: ', e));
    }

    return () => {
      if (connection) {
        connection.off('ReceiveMessage');
        connection.off('UserStatusChanged');
        connection.off('VideoCallStatusChanged');
        connection.off('KickedFromRoom');
        connection.stop();
      }
    };
  }, [connection, classroomId, onUserStatusChanged, onVideoCallStatusChanged, onKicked]);

  const sendMessage = useCallback(async (message: string, isFile: boolean = false, fileName?: string, fileUrl?: string) => {
    if (connection) {
      await connection.invoke('SendMessage', classroomId, message, isFile, fileName, fileUrl);
    }
  }, [connection, classroomId]);

  const startVideoSession = useCallback(async () => {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      await connection.invoke('StartVideoSession', classroomId);
    } else {
      console.warn('SignalR: Cannot start video session, connection not connected.', connection?.state);
      throw new Error('Secure signaling connection is not active.');
    }
  }, [connection, classroomId]);

  const endVideoSession = useCallback(async () => {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      await connection.invoke('EndVideoSession', classroomId);
    }
  }, [connection, classroomId]);

  const kickUser = useCallback(async (targetUserId: string) => {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      await connection.invoke('KickUser', classroomId, targetUserId);
    }
  }, [connection, classroomId]);

  return { messages, sendMessage, startVideoSession, endVideoSession, kickUser, connectionState: connection?.state };
};
