'use client';

import { useState } from 'react';
import { trpc } from '@/src/app/providers';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  Home,
  Sofa,
  Bed,
  UtensilsCrossed,
  Bath,
  Car,
  TreeDeciduous,
  Briefcase,
  X,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const roomIcons: Record<string, React.ReactNode> = {
  'living-room': <Sofa className="w-5 h-5" />,
  bedroom: <Bed className="w-5 h-5" />,
  kitchen: <UtensilsCrossed className="w-5 h-5" />,
  bathroom: <Bath className="w-5 h-5" />,
  garage: <Car className="w-5 h-5" />,
  outdoor: <TreeDeciduous className="w-5 h-5" />,
  office: <Briefcase className="w-5 h-5" />,
  other: <Home className="w-5 h-5" />,
};

interface Room {
  _id: string;
  name: string;
  icon?: string;
  floor?: number;
  deviceCount?: number;
}

export default function RoomsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

  // Fetch rooms
  const {
    data: rooms,
    isLoading,
    refetch,
  } = trpc.rooms.list.useQuery();

  // Filter rooms by search
  const filteredRooms = rooms?.filter((room) =>
    room.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Group by floor
  const roomsByFloor = filteredRooms.reduce((acc, room) => {
    const floor = room.floor ?? 0;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {} as Record<number, typeof filteredRooms>);

  const floors = Object.keys(roomsByFloor)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rooms</h1>
          <p className="text-muted-foreground">
            {rooms?.length || 0} rooms in your home
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Room
        </button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search rooms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={cn(
              'p-2 transition-colors',
              view === 'grid' ? 'bg-accent' : 'hover:bg-accent/50'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'p-2 transition-colors',
              view === 'list' ? 'bg-accent' : 'hover:bg-accent/50'
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          hasSearch={!!search}
          onAddRoom={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="space-y-8">
          {floors.map((floor) => (
            <div key={floor}>
              <h2 className="text-sm font-medium text-muted-foreground mb-4">
                {floor === 0 ? 'Ground Floor' : floor > 0 ? `Floor ${floor}` : `Basement ${Math.abs(floor)}`}
              </h2>
              <div
                className={cn(
                  view === 'grid'
                    ? 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'space-y-2'
                )}
              >
                {roomsByFloor[floor].map((room) => (
                  <RoomCard
                    key={room._id}
                    room={room}
                    view={view}
                    onEdit={() => setEditingRoom(room)}
                    onDelete={() => setDeletingRoom(room)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingRoom) && (
        <RoomFormModal
          room={editingRoom}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRoom(null);
          }}
          onSuccess={() => {
            refetch();
            setShowCreateModal(false);
            setEditingRoom(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingRoom && (
        <DeleteRoomModal
          room={deletingRoom}
          onClose={() => setDeletingRoom(null)}
          onSuccess={() => {
            refetch();
            setDeletingRoom(null);
          }}
        />
      )}
    </div>
  );
}

function RoomCard({
  room,
  view,
  onEdit,
  onDelete,
}: {
  room: Room;
  view: 'grid' | 'list';
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const Icon = roomIcons[room.icon || 'other'] || roomIcons.other;

  if (view === 'list') {
    return (
      <div className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
          {Icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{room.name}</h3>
          <p className="text-sm text-muted-foreground">
            {room.deviceCount || 0} devices
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <RoomMenu
              onEdit={() => {
                setShowMenu(false);
                onEdit();
              }}
              onDelete={() => {
                setShowMenu(false);
                onDelete();
              }}
              onClose={() => setShowMenu(false)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative p-6 rounded-xl border border-border hover:border-primary/50 bg-card transition-colors">
      {/* Menu button */}
      <div className="absolute top-3 right-3">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {showMenu && (
          <RoomMenu
            onEdit={() => {
              setShowMenu(false);
              onEdit();
            }}
            onDelete={() => {
              setShowMenu(false);
              onDelete();
            }}
            onClose={() => setShowMenu(false)}
          />
        )}
      </div>

      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        {Icon}
      </div>

      {/* Info */}
      <h3 className="font-semibold mb-1">{room.name}</h3>
      <p className="text-sm text-muted-foreground">
        {room.deviceCount || 0} devices
      </p>
    </div>
  );
}

function RoomMenu({
  onEdit,
  onDelete,
  onClose,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 w-40 bg-background border border-border rounded-lg shadow-lg z-20 py-1">
        <button
          onClick={onEdit}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-accent transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </>
  );
}

function EmptyState({
  hasSearch,
  onAddRoom,
}: {
  hasSearch: boolean;
  onAddRoom: () => void;
}) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border rounded-xl">
        <Search className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No rooms found</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Try adjusting your search to find rooms.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border rounded-xl">
      <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
        <Home className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No rooms yet</h3>
      <p className="text-muted-foreground text-center max-w-md mb-4">
        Create rooms to organize your devices by location. Rooms help you control devices by area.
      </p>
      <button
        onClick={onAddRoom}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Your First Room
      </button>
    </div>
  );
}

function RoomFormModal({
  room,
  onClose,
  onSuccess,
}: {
  room: Room | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(room?.name || '');
  const [icon, setIcon] = useState(room?.icon || 'other');
  const [floor, setFloor] = useState(room?.floor ?? 0);

  const createRoom = trpc.rooms.create.useMutation({
    onSuccess: () => onSuccess(),
  });

  const updateRoom = trpc.rooms.update.useMutation({
    onSuccess: () => onSuccess(),
  });

  const isLoading = createRoom.isPending || updateRoom.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (room) {
      updateRoom.mutate({ roomId: room._id, name, icon, floor });
    } else {
      createRoom.mutate({ name, icon, floor });
    }
  };

  const iconOptions = [
    { id: 'living-room', name: 'Living Room' },
    { id: 'bedroom', name: 'Bedroom' },
    { id: 'kitchen', name: 'Kitchen' },
    { id: 'bathroom', name: 'Bathroom' },
    { id: 'garage', name: 'Garage' },
    { id: 'outdoor', name: 'Outdoor' },
    { id: 'office', name: 'Office' },
    { id: 'other', name: 'Other' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-xl border border-border z-50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            {room ? 'Edit Room' : 'Create Room'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Room Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Living Room"
              className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Icon</label>
            <div className="grid grid-cols-4 gap-2">
              {iconOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setIcon(opt.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                    icon === opt.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  {roomIcons[opt.id]}
                  <span className="text-xs">{opt.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Floor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Floor</label>
            <select
              value={floor}
              onChange={(e) => setFloor(parseInt(e.target.value))}
              className="w-full px-4 py-2 rounded-lg border border-input bg-background"
            >
              <option value={-2}>Basement 2</option>
              <option value={-1}>Basement 1</option>
              <option value={0}>Ground Floor</option>
              <option value={1}>Floor 1</option>
              <option value={2}>Floor 2</option>
              <option value={3}>Floor 3</option>
            </select>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : room ? 'Save Changes' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function DeleteRoomModal({
  room,
  onClose,
  onSuccess,
}: {
  room: Room;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const deleteRoom = trpc.rooms.delete.useMutation({
    onSuccess: () => onSuccess(),
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-background rounded-xl border border-border p-6 z-50">
        <h3 className="text-lg font-semibold mb-2">Delete Room</h3>
        <p className="text-muted-foreground mb-6">
          Are you sure you want to delete <strong>{room.name}</strong>?
          Devices in this room will be unassigned.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => deleteRoom.mutate({ roomId: room._id })}
            disabled={deleteRoom.isPending}
            className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleteRoom.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </>
  );
}
