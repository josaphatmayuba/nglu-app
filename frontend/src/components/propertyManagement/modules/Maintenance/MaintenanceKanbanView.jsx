// SCRUM-72 — Kanban view (default) for the Maintenance panel.
// SCRUM-88 — Drag-and-drop between columns via @dnd-kit/core.
// 3 swim lanes: Ouvert / En cours / Résolu.

import moment from "moment";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable, useDraggable } from "@dnd-kit/core";

import { avatarColors } from "../../shared/constants";
import { initials } from "../../shared/tenants";
import { ticketIconFor, ticketIconTone } from "../../shared/units";

const COLUMNS = [
  { key: "open",        label: "Ouvert",   dotClass: "danger",  match: (r) => !r.status || r.status === "open" },
  { key: "in_progress", label: "En cours", dotClass: "warning", match: (r) => r.status === "in_progress" },
  { key: "done",        label: "Résolu",   dotClass: "success", match: (r) => r.status === "done" },
];

const priorityLabel = (p) =>
  ["urgent", "high"].includes(p) ? "Urgent" : p === "low" ? "Bas" : "Moyen";

const priorityClass = (p) =>
  ["urgent", "high"].includes(p) ? "danger" : p === "low" ? "neutral" : "warning";

// ── Draggable card ────────────────────────────────────────────────────────────

const KanbanCard = ({ request, index, colKey, onEdit, onDelete, isDragOverlay = false }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(request.id),
    data: { request, colKey },
    disabled: isDragOverlay,
  });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  };

  const assignee = request.assignee || request.assignedTo || request.technicianName;
  const dateRef = request.scheduledDate || request.createdAt || request.reportedAt;

  return (
    <article
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? { opacity: 1, cursor: "grabbing" } : style}
      className={`immo-kanban-card ${colKey === "done" ? "done" : ""}${isDragging ? " dragging" : ""}`}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
    >
      <div className="immo-kanban-card-head">
        <span className={`immo-ticket-icon-sm ${ticketIconTone(request)}`}>
          {ticketIconFor(request, 14)}
        </span>
        <span className={`immo-pill ${priorityClass(request.priority)}`}>
          {priorityLabel(request.priority)}
        </span>
        {(onEdit || onDelete) && (
          <span
            className="immo-menu-anchor"
            style={{ marginLeft: "auto" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={`immo-flat-icon${menuOpen ? " active" : ""}`}
              style={{ padding: "2px" }}
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              aria-label="Actions"
            >
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <ul className="immo-context-menu" role="menu">
                {onEdit && (
                  <li role="menuitem">
                    <button type="button" onClick={() => { setMenuOpen(false); onEdit(request); }}>
                      <Pencil size={13} /> Modifier
                    </button>
                  </li>
                )}
                {onDelete && (
                  <li role="menuitem" className="danger">
                    <button type="button" onClick={() => { setMenuOpen(false); onDelete(request); }}>
                      <Trash2 size={13} /> Supprimer
                    </button>
                  </li>
                )}
              </ul>
            )}
          </span>
        )}
      </div>
      <h4 className={colKey === "done" ? "done-title" : ""}>{request.title}</h4>
      <p className="muted">
        {request.property?.name || request.propertyName || "-"}
        {request.unitName ? ` · ${request.unitName}` : ""}
      </p>
      <footer>
        <span className="muted-sm">{dateRef ? moment(dateRef).fromNow() : "-"}</span>
        <span
          className={`mini-avatar ${assignee ? avatarColors[index % avatarColors.length] : "slate"}`}
          title={assignee || "Non assigné"}
        >
          {assignee ? initials(assignee) : "?"}
        </span>
      </footer>
    </article>
  );
};

// ── Droppable column ──────────────────────────────────────────────────────────

const DroppableColumn = ({ col, items, onEdit, onDelete, isOver }) => {
  const { setNodeRef } = useDroppable({ id: col.key });

  return (
    <div
      ref={setNodeRef}
      className={`immo-kanban-col col-${col.key}${isOver ? " drop-over" : ""}`}
    >
      <header className="immo-kanban-col-head">
        <span className={`immo-pill-dot ${col.dotClass}`}></span>
        <h3>{col.label}</h3>
        <span className="immo-kanban-count">{items.length}</span>
      </header>
      <div className="immo-kanban-body">
        {items.length === 0 && (
          <div className="immo-kanban-empty">
            {isOver ? "Déposer ici" : "Aucun ticket"}
          </div>
        )}
        {items.map((request, index) => (
          <KanbanCard
            key={request.id}
            request={request}
            index={index}
            colKey={col.key}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

// ── Main view ─────────────────────────────────────────────────────────────────

const MaintenanceKanbanView = ({ requests = [], onEdit, onDelete, onStatusChange }) => {
  const [activeItem, setActiveItem] = useState(null);
  const [overColKey, setOverColKey] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: requests.filter(col.match),
  }));

  const handleDragStart = ({ active }) => {
    const data = active.data.current;
    setActiveItem(data ? { request: data.request, colKey: data.colKey } : null);
  };

  const handleDragOver = ({ over }) => {
    setOverColKey(over ? over.id : null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveItem(null);
    setOverColKey(null);

    if (!over) return;

    const fromColKey = active.data.current?.colKey;
    const toColKey = over.id;

    if (!fromColKey || fromColKey === toColKey) return;

    const request = active.data.current?.request;
    if (!request) return;

    onStatusChange?.({ id: request.id, status: toColKey });
  };

  const handleDragCancel = () => {
    setActiveItem(null);
    setOverColKey(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="immo-kanban">
        {grouped.map((col) => (
          <DroppableColumn
            key={col.key}
            col={col}
            items={col.items}
            onEdit={onEdit}
            onDelete={onDelete}
            isOver={overColKey === col.key}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
        {activeItem && (
          <KanbanCard
            request={activeItem.request}
            index={0}
            colKey={activeItem.colKey}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default MaintenanceKanbanView;
