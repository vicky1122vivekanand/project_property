import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import socket from "../api/socket";
import { useAuth } from "../context/AuthContext";

const Messages = () => {
  const { user } = useAuth();
  const isOwnerLike = ["owner", "admin"].includes(user?.role);

  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    api
      .get("/messages/conversations")
      .then((res) => {
        setContacts(res.data.data);
        // Tenants/staff only ever have one contact (the owner) - auto-open it
        if (!isOwnerLike && res.data.data.length > 0) {
          setSelected(res.data.data[0]);
        }
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load contacts"))
      .finally(() => setLoadingContacts(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingThread(true);
    api
      .get(`/messages/${selected._id}`)
      .then((res) => setMessages(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load conversation"))
      .finally(() => setLoadingThread(false));
  }, [selected]);

  useEffect(() => {
    const handleNewMessage = (msg) => {
      // Only append if this message belongs to the thread currently open
      if (selected && (msg.sender._id === selected._id || msg.receiver._id === selected._id)) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on("message:new", handleNewMessage);
    return () => socket.off("message:new", handleNewMessage);
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    try {
      await api.post("/messages", { receiver: selected._id, text });
      setText("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          Private, direct chat — each conversation is only ever seen by you and the other person.
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>}

      <div className="card p-0 overflow-hidden grid grid-cols-1 sm:grid-cols-3 h-[32rem]">
        {isOwnerLike && (
          <div className="border-r border-gray-200 overflow-y-auto">
            <p className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
              Tenants & staff
            </p>
            {loadingContacts ? (
              <p className="text-sm text-gray-500 p-4">Loading...</p>
            ) : contacts.length === 0 ? (
              <p className="text-sm text-gray-500 p-4">No tenants or staff on your property yet.</p>
            ) : (
              contacts.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selected?._id === c._id ? "bg-primary-50" : ""
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{c.role}</p>
                </button>
              ))
            )}
          </div>
        )}

        <div className={`${isOwnerLike ? "sm:col-span-2" : "sm:col-span-3"} flex flex-col`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 px-4 text-center">
              {isOwnerLike
                ? "Select a tenant or staff member on the left to start chatting"
                : loadingContacts
                ? "Loading..."
                : "No property owner found to message yet."}
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900">{selected.name}</p>
                <p className="text-xs text-gray-500 capitalize">{selected.role}</p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {loadingThread ? (
                  <p className="text-sm text-gray-400 text-center mt-6">Loading conversation...</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center mt-6">
                    No messages yet. Say hello 👋
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender._id === user._id;
                    return (
                      <div key={m._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                            isMine ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? "text-primary-100" : "text-gray-400"}`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="border-t border-gray-200 p-3 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Type a message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button type="submit" className="btn-primary">
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
