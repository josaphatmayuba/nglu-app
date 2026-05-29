import { useEffect, useState } from 'react';
import { Mail, Plus, RefreshCw, Search } from 'lucide-react';
import { Button, Empty, Form, Input, Modal, Spin, Tabs, message as antMessage } from 'antd';
import axios from 'axios';
import usePermissions from '../../utils/usePermissions';
import MessageList from './MessageList';
import MessageDetail from './MessageDetail';
import ComposeMessage from './ComposeMessage';
import './messaging.css';

export default function MessagingPanel() {
  const { permissions } = usePermissions();
  const [messages, setMessages] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showMailboxModal, setShowMailboxModal] = useState(false);
  const [mailboxForm] = Form.useForm();
  const [creatingMailbox, setCreatingMailbox] = useState(false);
  const [composeInitialValues, setComposeInitialValues] = useState(null);
  const [composeTitle, setComposeTitle] = useState('Composer un nouveau message');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
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

  const canCreateMailbox = Array.isArray(permissions) && permissions.includes('create-mailAccount');

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

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/messages/accounts');
      setAccounts(response.data.data || []);
    } catch (error) {
      setAccounts([]);
    }
  };

  useEffect(() => {
    fetchAccounts();
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

  const openCompose = (initialValues = null, title = 'Composer un nouveau message') => {
    setComposeInitialValues(initialValues);
    setComposeTitle(title);
    setShowCompose(true);
  };

  const closeCompose = () => {
    setShowCompose(false);
    setComposeInitialValues(null);
    setComposeTitle('Composer un nouveau message');
  };

  const quotedBody = (msg) => {
    const original = msg.body || msg.htmlBody || '';
    return `\n\n--- Message original ---\nDe: ${msg.fromEmail}\nA: ${msg.toEmail}\nDate: ${msg.createdAt}\nObjet: ${msg.subject}\n\n${original}`;
  };

  const handleReply = (msg) => {
    openCompose(
      {
        toEmail: msg.fromEmail,
        subject: msg.subject?.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
        body: quotedBody(msg),
      },
      'Repondre au message',
    );
  };

  const handleReplyAll = (msg) => {
    const currentAccount = accounts[0]?.email?.toLowerCase();
    const recipients = [msg.fromEmail, msg.toEmail]
      .join(';')
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item, index, all) => all.findIndex((value) => value.toLowerCase() === item.toLowerCase()) === index)
      .filter((item) => item.toLowerCase() !== currentAccount);

    openCompose(
      {
        toEmail: recipients.join('; '),
        subject: msg.subject?.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
        body: quotedBody(msg),
      },
      'Repondre a tous',
    );
  };

  const handleForward = (msg) => {
    openCompose(
      {
        subject: msg.subject?.startsWith('Fwd:') ? msg.subject : `Fwd: ${msg.subject}`,
        body: quotedBody(msg),
      },
      'Transferer le message',
    );
  };

  const handleSyncInbox = async () => {
    setSyncing(true);
    try {
      const response = await axios.post('/messages/sync', null, { params: { limit: 50 } });
      await fetchMessages(1, status, searchTerm);
      antMessage.success(`${response.data.imported || 0} message(s) synchronise(s)`);
    } catch (error) {
      antMessage.error(error.response?.data?.message || 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateMailbox = async (values) => {
    setCreatingMailbox(true);
    try {
      const response = await axios.post('/mail-accounts', values);
      antMessage.success(`Courriel cree: ${response.data.email}`);
      mailboxForm.resetFields();
      setShowMailboxModal(false);
      fetchAccounts();
    } catch (error) {
      antMessage.error(error.response?.data?.message || 'Creation du courriel impossible');
    } finally {
      setCreatingMailbox(false);
    }
  };

  return (
    <div className="messaging-panel">
      <div className="messaging-header">
        <div className="messaging-title">
          <Mail size={24} />
          <h2>Messagerie ongdngolu.org</h2>
        </div>
        <div className="messaging-actions">
          <Button
            icon={<RefreshCw size={16} />}
            loading={syncing}
            onClick={handleSyncInbox}
          >
            Synchroniser
          </Button>
          {canCreateMailbox && (
            <Button onClick={() => setShowMailboxModal(true)}>
              Creer courriel
            </Button>
          )}
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => openCompose()}
          >
            Nouveau message
          </Button>
        </div>
      </div>

      {showCompose && (
        <div className="messaging-compose-container">
          <ComposeMessage
            accounts={accounts}
            initialValues={composeInitialValues}
            title={composeTitle}
            onSend={handleSendMessage}
            onCancel={closeCompose}
          />
        </div>
      )}

      <Modal
        title="Creer un courriel"
        open={showMailboxModal}
        onCancel={() => setShowMailboxModal(false)}
        onOk={() => mailboxForm.submit()}
        okText="Creer"
        confirmLoading={creatingMailbox}
        destroyOnClose
      >
        <Form
          form={mailboxForm}
          layout="vertical"
          requiredMark={false}
          onFinish={handleCreateMailbox}
        >
          <Form.Item
            label="Adresse courriel"
            name="localPart"
            extra="Entrez seulement le nom ou l'adresse complete @ongdngolu.org."
            rules={[
              { required: true, message: "L'adresse est requise" },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const text = String(value).trim().toLowerCase();
                  const localPart = text.includes('@') ? text.split('@')[0] : text;
                  const domain = text.includes('@') ? text.split('@').slice(1).join('@') : 'ongdngolu.org';
                  if (domain !== 'ongdngolu.org') {
                    return Promise.reject(new Error('Seul le domaine ongdngolu.org est autorise'));
                  }
                  if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(localPart) || localPart.includes('..')) {
                    return Promise.reject(new Error('Nom invalide'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input addonAfter="@ongdngolu.org" placeholder="support" />
          </Form.Item>
          <Form.Item
            label="Mot de passe temporaire"
            name="password"
            rules={[
              { required: true, message: 'Le mot de passe est requis' },
              { min: 8, message: 'Minimum 8 caracteres' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>

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
                      onReply={handleReply}
                      onReplyAll={handleReplyAll}
                      onForward={handleForward}
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
