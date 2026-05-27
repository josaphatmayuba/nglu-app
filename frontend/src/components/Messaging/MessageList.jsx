import { Mail, MailOpen } from 'lucide-react';
import moment from 'moment';
import './message-list.css';

export default function MessageList({
  messages,
  selectedId,
  onSelect,
}) {
  return (
    <div className="message-list">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`message-item ${selectedId === msg.id ? 'active' : ''} ${!msg.isRead ? 'unread' : ''}`}
          onClick={() => onSelect(msg)}
        >
          <div className="message-item-icon">
            {msg.isRead ? <MailOpen size={18} /> : <Mail size={18} />}
          </div>
          <div className="message-item-content">
            <div className="message-item-header">
              <span className="message-item-from">{msg.fromEmail}</span>
              <span className="message-item-time">
                {moment(msg.createdAt).format('DD MMM HH:mm')}
              </span>
            </div>
            <div className="message-item-subject">{msg.subject}</div>
            <div className="message-item-preview">
              {msg.body?.substring(0, 100) || msg.htmlBody?.substring(0, 100)}...
            </div>
            {msg.attachmentCount > 0 && (
              <div className="message-item-attachments">
                {msg.attachmentCount} pièce(s) jointe(s)
              </div>
            )}
          </div>
          {!msg.isRead && <div className="message-item-unread-dot" />}
        </div>
      ))}
    </div>
  );
}
