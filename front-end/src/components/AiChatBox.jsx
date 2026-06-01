import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Bot, Loader2, Send, X } from 'lucide-react';
import aiApi from '../api/aiApi';

const POSITION_KEY = 'eventflow.aiChatPosition';
const EDGE_GAP = 20;
const PANEL_SIZE = { width: 360, height: 520 };
const BUTTON_SIZE = { width: 132, height: 48 };

const getViewportSize = () => ({
  width: typeof window === 'undefined' ? 1280 : window.innerWidth,
  height: typeof window === 'undefined' ? 720 : window.innerHeight,
});

const clampPosition = (position, size) => {
  const viewport = getViewportSize();
  const maxX = Math.max(EDGE_GAP, viewport.width - size.width - EDGE_GAP);
  const maxY = Math.max(EDGE_GAP, viewport.height - size.height - EDGE_GAP);

  return {
    x: Math.min(Math.max(EDGE_GAP, position.x), maxX),
    y: Math.min(Math.max(EDGE_GAP, position.y), maxY),
  };
};

const getDefaultPosition = () => {
  const viewport = getViewportSize();
  return {
    x: Math.max(EDGE_GAP, viewport.width - BUTTON_SIZE.width - EDGE_GAP),
    y: Math.max(EDGE_GAP, viewport.height - BUTTON_SIZE.height - EDGE_GAP),
  };
};

const getSavedPosition = () => {
  if (typeof window === 'undefined') {
    return getDefaultPosition();
  }

  try {
    const saved = JSON.parse(window.localStorage.getItem(POSITION_KEY) || 'null');
    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
      return clampPosition(saved, BUTTON_SIZE);
    }
  } catch {
    return getDefaultPosition();
  }

  return getDefaultPosition();
};

const AiChatBox = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(getSavedPosition);
  const dragRef = useRef(null);
  const didDragRef = useRef(false);
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
      const assistantReply =
        response.reply?.trim() ||
        'Mình chưa nhận được phản hồi hợp lệ từ AI. Bạn thử diễn đạt lại yêu cầu rõ hơn nhé.';

      setDraft(response.draft || null);
      setCreatedEvent(response.createdEvent || null);
      setTargetEventId(response.targetEventId || response.draft?.targetEventId || null);
      setMessages((old) => [...old, { role: 'assistant', text: assistantReply }]);
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
    const history = [...messages, { role: 'user', text: message }]
      .slice(-12)
      .map(({ role, text }) => ({ role, text }));
    mutation.mutate({ message, draft, context: getPageContext(location.pathname), messages: history });
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

  const persistPosition = (nextPosition) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(nextPosition));
    }
  };

  const moveToPosition = (nextPosition, size) => {
    const clamped = clampPosition(nextPosition, size);
    setPosition(clamped);
    persistPosition(clamped);
  };

  const startDrag = (event, size) => {
    if (event.button !== 0) {
      return;
    }

    didDragRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: position,
      size,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleDragMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
      didDragRef.current = true;
    }

    moveToPosition(
      {
        x: drag.origin.x + deltaX,
        y: drag.origin.y + deltaY,
      },
      drag.size
    );
  };

  const stopDrag = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const openChat = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    setOpen(true);
    moveToPosition(position, PANEL_SIZE);
  };

  return (
    <div
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
    >
      {open ? (
        <section className="flex h-[520px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
          <div
            onPointerDown={(event) => startDrag(event, PANEL_SIZE)}
            onPointerMove={handleDragMove}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            className="flex cursor-move touch-none select-none items-center justify-between border-b border-gray-200 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
                <Bot size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">EventFlow AI</h3>
                <p className="text-xs text-gray-500">Tạo sự kiện và task bằng chat</p>
              </div>
            </div>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                setOpen(false);
                moveToPosition(position, BUTTON_SIZE);
              }}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
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
                  {message.text || 'Không có nội dung phản hồi.'}
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
          onPointerDown={(event) => startDrag(event, BUTTON_SIZE)}
          onPointerMove={handleDragMove}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onClick={openChat}
          className="inline-flex touch-none select-none items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-xl hover:bg-blue-700"
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
