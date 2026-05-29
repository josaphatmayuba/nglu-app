import { Forward, Reply, ReplyAll, Trash2, X } from 'lucide-react';
import { Button, Tooltip } from 'antd';
import moment from 'moment';
import './message-detail.css';

const sanitizeEmailHtml = (html) => {
  if (!html || typeof window === 'undefined' || !window.DOMParser) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, link, meta').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || value.startsWith('javascript:')) {
        node.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
};

export default function MessageDetail({
  message,
  onDelete,
  onMarkAsRead,
  onMarkAsUnread,
  onClose,
  onReply,
  onReplyAll,
  onForward,
}) {
  return (
    <div className="message-detail">
      <div className="message-detail-header">
        <div className="message-detail-title">
          <h3>{message.subject}</h3>
        </div>
        <div className="message-detail-actions">
          {!message.isRead && (
            <Tooltip title="Marquer comme lu">
              <Button type="text" size="small" onClick={() => onMarkAsRead(message.id)}>
                Marquer lu
              </Button>
            </Tooltip>
          )}
          {message.isRead && (
            <Tooltip title="Marquer comme non lu">
              <Button type="text" size="small" onClick={() => onMarkAsUnread(message.id)}>
                Marquer non lu
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Supprimer">
            <Button
              type="text"
              danger
              size="small"
              icon={<Trash2 size={16} />}
              onClick={() => {
                if (confirm('Etes-vous sur ?')) {
                  onDelete(message.id);
                }
              }}
            />
          </Tooltip>
          <Button type="text" size="small" icon={<X size={16} />} onClick={onClose} />
        </div>
      </div>

      <div className="message-detail-metadata">
        <div className="metadata-row">
          <span className="metadata-label">De :</span>
          <span className="metadata-value">{message.fromEmail}</span>
        </div>
        <div className="metadata-row">
          <span className="metadata-label">A :</span>
          <span className="metadata-value">{message.toEmail}</span>
        </div>
        <div className="metadata-row">
          <span className="metadata-label">Date :</span>
          <span className="metadata-value">
            {moment(message.createdAt).format('DD MMMM YYYY HH:mm:ss')}
          </span>
        </div>
        {message.attachmentCount > 0 && (
          <div className="metadata-row">
            <span className="metadata-label">Pieces jointes :</span>
            <span className="metadata-value">{message.attachmentCount}</span>
          </div>
        )}
      </div>

      <div className="message-detail-body">
        {message.htmlBody ? (
          <div
            dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(message.htmlBody) }}
            className="message-html-content"
          />
        ) : (
          <p style={{ whiteSpace: 'pre-wrap' }}>{message.body}</p>
        )}
      </div>

      {['received', 'read', 'unread'].includes(message.status) && (
        <div className="message-detail-reply">
          <Button type="primary" icon={<Reply size={16} />} onClick={() => onReply(message)}>
            Repondre
          </Button>
          <Button icon={<ReplyAll size={16} />} onClick={() => onReplyAll(message)}>
            Tous
          </Button>
          <Button icon={<Forward size={16} />} onClick={() => onForward(message)}>
            Transferer
          </Button>
        </div>
      )}
    </div>
  );
}
