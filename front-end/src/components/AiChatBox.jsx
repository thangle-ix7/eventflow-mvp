import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Bot, Loader2, Send, X } from 'lucide-react';
import aiApi from '../api/aiApi';

const AiChatBox = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Bạn có thể nhắn: tạo sự kiện seminar AI ngày mai 8h tại FPTU, task check-in, truyền thông, hậu cần.',
    },
  ]);
  const [createdEvent, setCreatedEvent] = useState(null);
  const [targetEventId, setTargetEventId] = useState(null);

  const mutation = useMutation({
    mutationFn: aiApi.chat,
    onSuccess: (response) => {
      setDraft(response.draft || null);
      setCreatedEvent(response.createdEvent || null);
      setTargetEventId(response.targetEventId || response.draft?.targetEventId || null);
      setMessages((old) => [...old, { role: 'assistant', text: response.reply }]);
      if (response.completed) {
        queryClient.invalidateQueries({ queryKey: ['eventsPage'] });
        if (response.targetEventId) {
          queryClient.invalidateQueries({ queryKey: ['eventTaskPage', String(response.targetEventId)] });
          queryClient.invalidateQueries({ queryKey: ['eventTaskPage', response.targetEventId] });
        }
      }
    },
    onError: (error) => {
      setMessages((old) => [
        ...old,
        { role: 'assistant', text: error.userMessage || error.message || 'Không gọi được AI assistant.' },
      ]);
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || mutation.isPending) {
      return;
    }

    setMessages((old) => [...old, { role: 'user', text: message }]);
    setInput('');
    mutation.mutate({ message, draft, context: getPageContext(location.pathname) });
  };

  const resetChat = () => {
    setDraft(null);
    setCreatedEvent(null);
    setTargetEventId(null);
    setMessages([
      {
        role: 'assistant',
        text: 'Đã bắt đầu lại. Bạn muốn tôi tạo sự kiện gì?',
      },
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <section className="flex h-[520px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
                <Bot size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">EventFlow AI</h3>
                <p className="text-xs text-gray-500">Tạo sự kiện và task bằng chat</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={[
                    'max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-6',
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 bg-white text-gray-700',
                  ].join(' ')}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {mutation.isPending && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
                  <Loader2 className="animate-spin" size={16} />
                  Đang xử lý...
                </div>
              </div>
            )}
            {createdEvent && (
              <Link
                to={`/events/${createdEvent.id}`}
                onClick={() => setOpen(false)}
                className="block rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                Mở sự kiện vừa tạo: {createdEvent.name}
              </Link>
            )}
            {!createdEvent && targetEventId && (
              <Link
                to={`/events/${targetEventId}/tasks`}
                onClick={() => setOpen(false)}
                className="block rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                Mở danh sách task sự kiện #{targetEventId}
              </Link>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Nhập yêu cầu hoặc câu trả lời..."
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                <Send size={17} />
              </button>
            </div>
            <button type="button" onClick={resetChat} className="mt-2 text-xs font-semibold text-gray-500 hover:text-gray-700">
              Bắt đầu lại
            </button>
          </form>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-xl hover:bg-blue-700"
        >
          <Bot size={18} />
          AI Chat
        </button>
      )}
    </div>
  );
};

const getPageContext = (path) => {
  const eventMatch = path.match(/\/events\/(\d+)/);
  const taskMatch = path.match(/\/tasks\/(\d+)/);
  return {
    path,
    eventId: eventMatch ? Number(eventMatch[1]) : null,
    taskId: taskMatch ? Number(taskMatch[1]) : null,
  };
};

export default AiChatBox;
