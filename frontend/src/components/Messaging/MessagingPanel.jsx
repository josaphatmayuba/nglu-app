import { useEffect, useState } from 'react';
import { Mail, Plus, Search } from 'lucide-react';
import { Button, Empty, Input, Spin, Tabs, message as antMessage } from 'antd';
import axios from 'axios';
import MessageList from './MessageList';
import MessageDetail from './MessageDetail';
import ComposeMessage from './ComposeMessage';
import './messaging.css';

export default function MessagingPanel() {
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('inbox');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const statusTabs = [
    { key: 'inbox', label: 'Reçus' },
    { key: 'sent', label: 'Envoyés' },
    { key: 'draft', label: 'Brouillons' },
    { key: 'unread', label: 'Non lus' },
    { key: 'trash', label: 'Corbeille' },
  ];

  const fetchMessages = async (pageNum = 1, statusVal = status, searchVal = searchTerm) => {
    setLoading(true);
    try {
      const response = await axios.get('/messages', {
        params: {
          page: pageNum,
          limit: 20,
          folder: statusVal === 'inbox' ? 'inbox' : undefined,
          status: statusVal !== 'inbox' ? statusVal : undefined,
          search: searchVal || undefined,
        },
      });

      setMessages(response.data.data);
      setPagination({
        page: response.data.page,
        limit: response.data.pageSize,
        total: response.data.total,
      });
    } catch (error) {
      antMessage.error('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [status]);

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setSelectedMessage(null);
    setPagination({ page: 1, limit: 20, total: 0 });
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPagination({ page: 1, limit: 20, total: 0 });
    fetchMessages(1, status, value);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.post(`/messages/${id}/mark-as-read`);
      fetchMessages(pagination.page, status, searchTerm);
      antMessage.success('Message marqué comme lu');
    } catch (error) {
      antMessage.error('Erreur lors de la mise à jour');
    }
  };

  const handleMarkAsUnread = async (id) => {
    try {
      await axios.post(`/messages/${id}/mark-as-unread`);
      fetchMessages(pagination.page, status, searchTerm);
      antMessage.success('Message marqué comme non lu');
    } catch (error) {
      antMessage.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/messages/${id}`);
      fetchMessages(pagination.page, status, searchTerm);
      setSelectedMessage(null);
      antMessage.success('Message supprimé');
    } catch (error) {
      antMessage.error('Erreur lors de la suppression');
    }
  };

  const handleSendMessage = async (messageData) => {
    try {
      await axios.post('/messages', messageData);
      setShowCompose(false);
      fetchMessages();
      antMessage.success('Message envoyé avec succès');
    } catch (error) {
      antMessage.error(error.response?.data?.message || "Erreur lors de l'envoi");
    }
  };

  return (
    <div className="messaging-panel">
      <div className="messaging-header">
        <div className="messaging-title">
          <Mail size={24} />
          <h2>Messagerie ongdngolu.org</h2>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => setShowCompose(true)}
        >
          Nouveau message
        </Button>
      </div>

      {showCompose && (
        <div className="messaging-compose-container">
          <ComposeMessage
            onSend={handleSendMessage}
            onCancel={() => setShowCompose(false)}
          />
        </div>
      )}

      <div className="messaging-search">
        <Input
          placeholder="Rechercher dans les messages..."
          prefix={<Search size={16} />}
          value={searchTerm}
          onChange={(event) => handleSearch(event.target.value)}
          style={{ maxWidth: '400px' }}
        />
      </div>

      <Tabs
        activeKey={status}
        items={statusTabs.map((tab) => ({
          key: tab.key,
          label: tab.label,
          children: (
            <Spin spinning={loading}>
              {messages.length > 0 ? (
                <div className="messaging-content">
                  <MessageList
                    messages={messages}
                    selectedId={selectedMessage?.id}
                    onSelect={setSelectedMessage}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAsUnread={handleMarkAsUnread}
                  />
                  {selectedMessage && (
                    <MessageDetail
                      message={selectedMessage}
                      onDelete={handleDelete}
                      onMarkAsRead={handleMarkAsRead}
                      onMarkAsUnread={handleMarkAsUnread}
                      onClose={() => setSelectedMessage(null)}
                    />
                  )}
                </div>
              ) : (
                <Empty description="Aucun message" />
              )}
            </Spin>
          ),
        }))}
        onChange={handleStatusChange}
      />
    </div>
  );
}
