import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Armchair,
  Sun,
  Sparkles,
  Accessibility,
  Plus,
  LayoutGrid,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Filter,
  Layers,
  X,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import useAuth from "../../hooks/useAuth";
import {
  getLibrarySeats,
  createSeat,
  updateSeat,
  deleteSeat,
  configureBulkLayout,
} from "../../services/seatService";
import { getLibraries } from "../../services/booksService";
import { getUserProfile } from "../../services/authService";

const SEAT_TYPES = [
  { value: "regular", label: "Regular", icon: Armchair, color: "text-amber-700 bg-amber-50 border-[#F3E8C8]" },
  { value: "window", label: "Window", icon: Sun, color: "text-sky-700 bg-sky-50 border-sky-200" },
  { value: "premium", label: "Premium", icon: Sparkles, color: "text-purple-700 bg-purple-50 border-purple-200" },
  { value: "accessible", label: "Accessible", icon: Accessibility, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
];

function getSeatTypeMeta(type) {
  const normalized = (type || "").toLowerCase().trim();
  return SEAT_TYPES.find((t) => t.value === normalized) || SEAT_TYPES[0];
}

export default function LibrarianSeatingLayout() {
  const { user } = useAuth();

  // State
  const [libraryId, setLibraryId] = useState(null);
  const [libraryInfo, setLibraryInfo] = useState(null);
  const [availableLibraries, setAvailableLibraries] = useState([]);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Selection & Modals
  const [selectedSeat, setSelectedSeat] = useState(null);

  // Modal Dialog Refs
  const bulkDialogRef = useRef(null);
  const singleDialogRef = useRef(null);
  const editDialogRef = useRef(null);

  // Bulk layout form state
  const [bulkRows, setBulkRows] = useState(5);
  const [bulkCols, setBulkCols] = useState(8);
  const [bulkPrefix, setBulkPrefix] = useState("S");
  const [bulkType, setBulkType] = useState("regular");
  const [bulkReplace, setBulkReplace] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Single seat form state
  const [singleSeatNumber, setSingleSeatNumber] = useState("");
  const [singleRow, setSingleRow] = useState(1);
  const [singleCol, setSingleCol] = useState(1);
  const [singleType, setSingleType] = useState("regular");
  const [singleActive, setSingleActive] = useState(true);
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  // Edit seat form state
  const [editSeatNumber, setEditSeatNumber] = useState("");
  const [editRow, setEditRow] = useState(1);
  const [editCol, setEditCol] = useState(1);
  const [editType, setEditType] = useState("regular");
  const [editActive, setEditActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Resolve assigned library
  useEffect(() => {
    async function resolveLibrary() {
      if (!user) return;

      if (user.role === "librarian") {
        let assignedId = user.library;
        if (typeof assignedId === "object" && assignedId?._id) {
          assignedId = assignedId._id;
        }

        if (!assignedId) {
          try {
            const profileRes = await getUserProfile();
            const profLib = profileRes?.user?.library;
            assignedId = typeof profLib === "object" ? profLib?._id : profLib;
          } catch (err) {
            console.error("Failed to fetch user profile for library context:", err);
          }
        }

        if (assignedId) {
          setLibraryId(String(assignedId));
        } else {
          setError("No library assigned to your account. Please contact an administrator.");
          setLoading(false);
        }
      } else if (user.role === "admin") {
        // Admin can manage any library - fetch libraries list
        try {
          const libsRes = await getLibraries();
          const list = libsRes.libraries || [];
          setAvailableLibraries(list);
          setLibraryId((curr) => curr || (list.length > 0 ? String(list[0]._id) : null));
        } catch (err) {
          console.error("Failed to fetch libraries list for admin:", err);
          setError("Failed to load libraries list.");
          setLoading(false);
        }
      }
    }

    resolveLibrary();
  }, [user]);

  // Fetch seats whenever libraryId changes
  const fetchSeats = useCallback(async () => {
    if (!libraryId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getLibrarySeats(libraryId);
      setSeats(data.seats || []);
      setLibraryInfo(data.library || null);
    } catch (err) {
      console.error("fetchSeats error:", err);
      const msg = err.response?.data?.message || "Failed to load library seats.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [libraryId]);

  useEffect(() => {
    if (libraryId) {
      fetchSeats();
    }
  }, [libraryId, fetchSeats]);

  // Derived calculations
  const totalSeats = seats.length;
  const activeSeats = useMemo(() => seats.filter((s) => s.isActive).length, [seats]);
  const inactiveSeats = totalSeats - activeSeats;

  // Breakdown by type
  const typeCounts = useMemo(() => {
    const counts = { regular: 0, window: 0, premium: 0, accessible: 0 };
    seats.forEach((s) => {
      const t = (s.type || "regular").toLowerCase();
      if (counts[t] !== undefined) counts[t]++;
    });
    return counts;
  }, [seats]);

  // Group seats by row
  const groupedSeats = useMemo(() => {
    const map = {};
    seats.forEach((seat) => {
      // Filter type
      if (filterType !== "all" && seat.type?.toLowerCase() !== filterType) {
        return;
      }
      // Filter status
      if (filterStatus === "active" && !seat.isActive) return;
      if (filterStatus === "inactive" && seat.isActive) return;

      const r = seat.row || 1;
      if (!map[r]) map[r] = [];
      map[r].push(seat);
    });

    // Sort columns inside each row
    Object.keys(map).forEach((r) => {
      map[r].sort((a, b) => a.column - b.column);
    });

    return map;
  }, [seats, filterType, filterStatus]);

  const rowNumbers = useMemo(() => {
    return Object.keys(groupedSeats)
      .map(Number)
      .sort((a, b) => a - b);
  }, [groupedSeats]);

  // Grid dimensions
  const maxRow = useMemo(() => {
    return seats.length > 0 ? Math.max(...seats.map((s) => s.row)) : 0;
  }, [seats]);
  const maxCol = useMemo(() => {
    return seats.length > 0 ? Math.max(...seats.map((s) => s.column)) : 0;
  }, [seats]);

  // =========================================================================
  // Handlers
  // =========================================================================

  // Open Bulk Modal
  const handleOpenBulkModal = () => {
    setBulkRows(maxRow > 0 ? maxRow : 5);
    setBulkCols(maxCol > 0 ? maxCol : 8);
    setBulkPrefix("S");
    setBulkType("regular");
    setBulkReplace(false);
    bulkDialogRef.current?.showModal();
  };

  const handleCloseBulkModal = () => {
    bulkDialogRef.current?.close();
  };

  // Submit Bulk Layout
  const handleSubmitBulkLayout = async (e) => {
    e.preventDefault();
    if (bulkRows < 1 || bulkRows > 50 || bulkCols < 1 || bulkCols > 50) {
      toast.error("Rows and columns must be integers between 1 and 50.");
      return;
    }
    if (bulkRows * bulkCols > 1000) {
      toast.error("Layout capacity exceeds maximum allowed of 1000 seats.");
      return;
    }

    setBulkSubmitting(true);
    try {
      const payload = {
        libraryId,
        rows: Number(bulkRows),
        columns: Number(bulkCols),
        prefix: bulkPrefix.trim() || "S",
        type: bulkType,
        replaceExisting: Boolean(bulkReplace),
      };

      const res = await configureBulkLayout(payload);
      toast.success(res.message || "Seating layout configured successfully!");
      handleCloseBulkModal();
      await fetchSeats();
    } catch (err) {
      console.error("Bulk layout error:", err);
      toast.error(err.response?.data?.message || "Failed to configure bulk layout.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Open Single Modal
  const handleOpenSingleModal = () => {
    // Suggest next available row/col
    const nextRow = maxRow > 0 ? maxRow : 1;
    const nextCol = maxCol > 0 ? maxCol + 1 : 1;
    setSingleSeatNumber(`S-${nextRow}-${nextCol}`);
    setSingleRow(nextRow);
    setSingleCol(nextCol);
    setSingleType("regular");
    setSingleActive(true);
    singleDialogRef.current?.showModal();
  };

  const handleCloseSingleModal = () => {
    singleDialogRef.current?.close();
  };

  // Submit Single Seat
  const handleSubmitSingleSeat = async (e) => {
    e.preventDefault();
    const trimmed = singleSeatNumber.trim();
    if (!trimmed) {
      toast.error("Seat number is required.");
      return;
    }
    if (Number(singleRow) < 1 || Number(singleCol) < 1) {
      toast.error("Row and column must be greater than or equal to 1.");
      return;
    }

    setSingleSubmitting(true);
    try {
      const payload = {
        libraryId,
        seatNumber: trimmed,
        row: Number(singleRow),
        column: Number(singleCol),
        type: singleType,
        isActive: singleActive,
      };

      const res = await createSeat(payload);
      toast.success(res.message || "Seat created successfully!");
      handleCloseSingleModal();
      await fetchSeats();
    } catch (err) {
      console.error("Single seat error:", err);
      toast.error(err.response?.data?.message || "Failed to create seat.");
    } finally {
      setSingleSubmitting(false);
    }
  };

  // Select Seat & Open Edit Modal
  const handleSelectSeat = (seat) => {
    setSelectedSeat(seat);
    setEditSeatNumber(seat.seatNumber);
    setEditRow(seat.row);
    setEditCol(seat.column);
    setEditType(seat.type || "regular");
    setEditActive(seat.isActive);
    editDialogRef.current?.showModal();
  };

  const handleCloseEditModal = () => {
    editDialogRef.current?.close();
    setSelectedSeat(null);
  };

  // Submit Seat Edit
  const handleSubmitEditSeat = async (e) => {
    e.preventDefault();
    if (!selectedSeat) return;

    const trimmed = editSeatNumber.trim();
    if (!trimmed) {
      toast.error("Seat number cannot be empty.");
      return;
    }

    setEditSubmitting(true);
    try {
      const payload = {
        seatNumber: trimmed,
        row: Number(editRow),
        column: Number(editCol),
        type: editType,
        isActive: editActive,
      };

      const res = await updateSeat(selectedSeat._id, payload);
      toast.success(res.message || "Seat updated successfully!");
      handleCloseEditModal();
      await fetchSeats();
    } catch (err) {
      console.error("Update seat error:", err);
      toast.error(err.response?.data?.message || "Failed to update seat.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Toggle Active Status Directly
  const handleToggleSeatActive = async (seat) => {
    try {
      const newStatus = !seat.isActive;
      const res = await updateSeat(seat._id, { isActive: newStatus });
      toast.success(
        res.message || `Seat ${seat.seatNumber} ${newStatus ? "activated" : "deactivated"}!`
      );
      if (selectedSeat?._id === seat._id) {
        setEditActive(newStatus);
        setSelectedSeat((prev) => (prev ? { ...prev, isActive: newStatus } : null));
      }
      await fetchSeats();
    } catch (err) {
      console.error("Toggle seat active error:", err);
      toast.error(err.response?.data?.message || "Failed to update seat status.");
    }
  };

  // Delete Seat
  const handleDeleteSeat = async () => {
    if (!selectedSeat) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete seat ${selectedSeat.seatNumber}? If this seat has historical bookings, it will be safely deactivated to preserve audit history.`
    );
    if (!confirmDelete) return;

    setDeleteSubmitting(true);
    try {
      const res = await deleteSeat(selectedSeat._id);
      if (res.deactivated) {
        toast(res.message, { icon: "ℹ️" });
      } else {
        toast.success(res.message || "Seat deleted successfully!");
      }
      handleCloseEditModal();
      await fetchSeats();
    } catch (err) {
      console.error("Delete seat error:", err);
      toast.error(err.response?.data?.message || "Cannot delete seat with active bookings.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <DashboardLayout>
      <PageContainer>
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 border-b border-[#F3E8C8] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <Building2 size={13} />
                {libraryInfo?.name || "Library Seating"}
              </span>
              {libraryInfo?.city && (
                <span className="text-xs text-gray-500">• {libraryInfo.city}</span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1F2937] sm:text-3xl">
              Seating Layout Management
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure, customize, and maintain the interactive floor plan of library study seats.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {user?.role === "admin" && availableLibraries.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="admin-library-select" className="text-xs font-medium text-gray-600">
                  Target:
                </label>
                <select
                  id="admin-library-select"
                  value={libraryId || ""}
                  onChange={(e) => setLibraryId(e.target.value)}
                  className="rounded-lg border border-[#F3E8C8] bg-white px-2.5 py-2 text-xs font-medium text-[#1F2937] shadow-sm focus:border-[#F4B400] focus:outline-none"
                >
                  {availableLibraries.map((lib) => (
                    <option key={lib._id} value={lib._id}>
                      {lib.name} ({lib.city})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleOpenBulkModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F4B400] px-3.5 py-2.5 text-sm font-semibold text-[#1F2937] shadow-sm transition hover:bg-[#F59E0B]"
            >
              <LayoutGrid size={16} />
              Configure Grid
            </button>

            <button
              type="button"
              onClick={handleOpenSingleModal}
              className="inline-flex items-center gap-2 rounded-xl border border-[#F3E8C8] bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-amber-50"
            >
              <Plus size={16} />
              Add Seat
            </button>

            <button
              type="button"
              onClick={fetchSeats}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#F3E8C8] bg-white p-2.5 text-gray-700 shadow-sm transition hover:bg-amber-50 disabled:opacity-50"
              title="Refresh Layout"
              aria-label="Refresh Layout"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-xl border border-[#F3E8C8] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-medium">Total Active</span>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#1F2937]">{activeSeats}</p>
            <p className="mt-0.5 text-xs text-gray-400">Available to students</p>
          </div>

          <div className="rounded-xl border border-[#F3E8C8] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-medium">Layout Grid</span>
              <Layers size={16} className="text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#1F2937]">
              {maxRow} × {maxCol}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">Rows × Columns</p>
          </div>

          <div className="rounded-xl border border-[#F3E8C8] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-medium">Inactive Seats</span>
              <XCircle size={16} className="text-gray-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-600">{inactiveSeats}</p>
            <p className="mt-0.5 text-xs text-gray-400">Under maintenance</p>
          </div>

          <div className="col-span-2 rounded-xl border border-[#F3E8C8] bg-white p-4 shadow-sm sm:col-span-1 lg:col-span-2">
            <span className="text-xs font-medium text-gray-500">Seat Types Breakdown</span>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-800">
                <Armchair size={13} /> {typeCounts.regular} Regular
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 font-medium text-sky-800">
                <Sun size={13} /> {typeCounts.window} Window
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 font-medium text-purple-800">
                <Sparkles size={13} /> {typeCounts.premium} Premium
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-800">
                <Accessibility size={13} /> {typeCounts.accessible} Accessible
              </span>
            </div>
          </div>
        </div>

        {/* Filter and Legend Controls */}
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#F3E8C8] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
              <Filter size={14} /> Filters:
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-[#F3E8C8] bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:border-[#F4B400] focus:outline-none"
              aria-label="Filter by seat type"
            >
              <option value="all">All Seat Types</option>
              <option value="regular">Regular</option>
              <option value="window">Window</option>
              <option value="premium">Premium</option>
              <option value="accessible">Accessible</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-[#F3E8C8] bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:border-[#F4B400] focus:outline-none"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Visual Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-[#F3E8C8] bg-amber-100" /> Regular
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-sky-300 bg-sky-100" /> Window
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-purple-300 bg-purple-100" /> Premium
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-100" /> Accessible
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-dashed border-gray-400 bg-gray-200" /> Inactive
            </span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="font-semibold">Unable to manage seating</p>
              <p className="mt-0.5 text-red-700">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchSeats}
              className="rounded-lg bg-red-100 px-3 py-1 font-semibold text-red-900 hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-[#F3E8C8] bg-white p-5"
              >
                <div className="h-4 w-24 rounded bg-amber-100" />
                <div className="mt-4 flex flex-wrap gap-3">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <div key={j} className="h-16 w-20 rounded-xl bg-gray-100" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && seats.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-[#F3E8C8] bg-white p-12 text-center shadow-sm">
            <Armchair size={48} className="mx-auto text-amber-500" />
            <h2 className="mt-4 text-xl font-bold text-[#1F2937]">No Seats Configured Yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
              Your library currently has no study seats configured. You can quickly generate a
              complete grid layout or add seats individually.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={handleOpenBulkModal}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F4B400] px-4 py-2.5 text-sm font-semibold text-[#1F2937] shadow-sm transition hover:bg-[#F59E0B]"
              >
                <LayoutGrid size={16} />
                Configure Bulk Grid
              </button>
              <button
                type="button"
                onClick={handleOpenSingleModal}
                className="inline-flex items-center gap-2 rounded-xl border border-[#F3E8C8] bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-amber-50"
              >
                <Plus size={16} />
                Add First Seat
              </button>
            </div>
          </div>
        )}

        {/* Interactive Visual Seating Grid */}
        {!loading && !error && seats.length > 0 && (
          <div className="mt-6 space-y-5">
            {rowNumbers.length === 0 ? (
              <div className="rounded-xl border border-[#F3E8C8] bg-white p-8 text-center text-sm text-gray-500">
                No seats match the selected filter criteria.
              </div>
            ) : (
              rowNumbers.map((rowNum) => {
                const rowSeats = groupedSeats[rowNum] || [];
                return (
                  <section
                    key={rowNum}
                    aria-labelledby={`row-heading-${rowNum}`}
                    className="rounded-2xl border border-[#F3E8C8] bg-white p-5 shadow-sm transition hover:border-[#EACD7D]"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h2
                        id={`row-heading-${rowNum}`}
                        className="flex items-center gap-2 text-sm font-bold text-[#1F2937]"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-xs text-amber-900">
                          {rowNum}
                        </span>
                        Row {rowNum}
                      </h2>
                      <span className="text-xs text-gray-400">
                        {rowSeats.length} {rowSeats.length === 1 ? "seat" : "seats"}
                      </span>
                    </div>

                    {/* Horizontal scrollable row grid */}
                    <div className="mt-4 flex flex-wrap gap-3 overflow-x-auto pb-1">
                      {rowSeats.map((seat) => {
                        const meta = getSeatTypeMeta(seat.type);
                        const Icon = meta.icon;
                        const isInactive = !seat.isActive;

                        return (
                          <button
                            key={seat._id}
                            type="button"
                            onClick={() => handleSelectSeat(seat)}
                            aria-label={`Seat ${seat.seatNumber}, Row ${seat.row}, Column ${seat.column}, ${meta.label} type, ${
                              seat.isActive ? "active" : "inactive"
                            }`}
                            className={`group relative flex flex-col items-center justify-between rounded-xl border p-2.5 text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#F4B400] ${
                              isInactive
                                ? "border-dashed border-gray-300 bg-gray-50 text-gray-400 opacity-60 hover:opacity-100"
                                : `${meta.color} shadow-xs hover:-translate-y-1 hover:shadow-md`
                            } h-20 w-24 shrink-0`}
                          >
                            {/* Type icon & status pill */}
                            <div className="flex w-full items-center justify-between">
                              <Icon size={14} className={isInactive ? "text-gray-400" : ""} />
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  isInactive ? "bg-gray-400" : "bg-emerald-500"
                                }`}
                                title={isInactive ? "Inactive" : "Active"}
                              />
                            </div>

                            {/* Seat Number */}
                            <span className="text-xs font-bold tracking-tight text-[#1F2937]">
                              {seat.seatNumber}
                            </span>

                            {/* Position & Type */}
                            <div className="flex w-full items-center justify-between text-[10px] text-gray-500">
                              <span>
                                R{seat.row}C{seat.column}
                              </span>
                              <span className="capitalize">{meta.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* MODAL 1: Bulk Layout Configuration Modal                            */}
        {/* =================================================================== */}
        <dialog
          ref={bulkDialogRef}
          aria-labelledby="bulk-layout-title"
          className="fixed inset-0 z-50 m-auto w-full max-w-lg rounded-2xl border border-[#F3E8C8] bg-white p-6 shadow-2xl backdrop:bg-gray-900/40"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 id="bulk-layout-title" className="flex items-center gap-2 text-lg font-bold text-[#1F2937]">
              <LayoutGrid size={20} className="text-amber-600" />
              Configure Seating Grid
            </h2>
            <button
              type="button"
              onClick={handleCloseBulkModal}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmitBulkLayout} className="mt-4 space-y-4">
            <p className="text-xs text-gray-500">
              Generate a structured grid of seats for this library. Existing seats in identical positions
              will be preserved and reactivated.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="bulk-rows" className="block text-xs font-semibold text-gray-700">
                  Rows (1 – 50)
                </label>
                <input
                  id="bulk-rows"
                  type="number"
                  min="1"
                  max="50"
                  value={bulkRows}
                  onChange={(e) => setBulkRows(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-[#F3E8C8] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#F4B400] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="bulk-cols" className="block text-xs font-semibold text-gray-700">
                  Columns (1 – 50)
                </label>
                <input
                  id="bulk-cols"
                  type="number"
                  min="1"
                  max="50"
                  value={bulkCols}
                  onChange={(e) => setBulkCols(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-[#F3E8C8] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#F4B400] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="bulk-prefix" className="block text-xs font-semibold text-gray-700">
                  Numbering Prefix
                </label>
                <input
                  id="bulk-prefix"
                  type="text"
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  placeholder="e.g. S, A, W"
                  maxLength={10}
                  className="mt-1 w-full rounded-xl border border-[#F3E8C8] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#F4B400] focus:outline-none"
                />
                <span className="text-[10px] text-gray-400">Yields: {bulkPrefix || "S"}-1-1, {bulkPrefix || "S"}-1-2...</span>
              </div>

              <div>
                <label htmlFor="bulk-type" className="block text-xs font-semibold text-gray-700">
                  Default Seat Type
                </label>
                <select
                  id="bulk-type"
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#F3E8C8] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#F4B400] focus:outline-none"
                >
                  <option value="regular">Regular</option>
                  <option value="window">Window</option>
                  <option value="premium">Premium</option>
                  <option value="accessible">Accessible</option>
                </select>
              </div>
            </div>

            {/* Replace Existing Checkbox */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
              <label className="flex items-start gap-2.5 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={bulkReplace}
                  onChange={(e) => setBulkReplace(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-semibold">Deactivate seats outside new dimensions</span>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    If rows or columns are decreased, unbooked seats beyond the new boundary will be
                    safely deactivated.
                  </p>
                </div>
              </label>
            </div>

            {/* Live Interactive Preview */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                <span>Layout Preview</span>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">
                  {Number(bulkRows) * Number(bulkCols)} total seats
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                Pattern: {bulkPrefix || "S"}-1-1 ... {bulkPrefix || "S"}-{bulkRows}-{bulkCols}
              </p>

              {/* Mini visual grid */}
              <div
                className="mt-2.5 grid max-h-32 gap-1 overflow-auto rounded-lg border border-gray-200 bg-white p-2"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(bulkCols, 12)}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: Math.min(bulkRows * bulkCols, 48) }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex h-5 items-center justify-center rounded bg-amber-100 text-[8px] font-bold text-amber-800"
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>
              {Number(bulkRows) * Number(bulkCols) > 48 && (
                <p className="mt-1 text-center text-[10px] text-gray-400">
                  + {Number(bulkRows) * Number(bulkCols) - 48} more seats in grid
                </p>
              )}
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCloseBulkModal}
                disabled={bulkSubmitting}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bulkSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F4B400] px-4 py-2 text-sm font-semibold text-[#1F2937] shadow-sm hover:bg-[#F59E0B] disabled:opacity-50"
              >
                {bulkSubmitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Generating...
                  </>
                ) : (
                  "Generate Layout"
                )}
              </button>
            </div>
          </form>
        </dialog>

        {/* =================================================================== */}
        {/* MODAL 2: Single Seat Creation Modal                                 */}
        {/* =================================================================== */}
        <dialog
          ref={singleDialogRef}
          aria-labelledby="single-seat-title"
          className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-2xl border border-[#F3E8C8] bg-white p-6 shadow-2xl backdrop:bg-gray-900/40"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 id="single-seat-title" className="flex items-center gap-2 text-lg font-bold text-[#1F2937]">
              <Plus size={20} className="text-amber-600" />
              Add Individual Seat
            </h2>
            <button
              type="button"
              onClick={handleCloseSingleModal}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmitSingleSeat} className="mt-4 space-y-4">
            <div>
              <label htmlFor="single-seat-number" className="block text-xs font-semibold text-gray-700">
                Seat Number / Identifier
              </label>
              <input
                id="single-seat-number"
                type="text"
                value={singleSeatNumber}
                onChange={(e) => setSingleSeatNumber(e.target.value)}
                placeholder="e.g. A-1, WIN-10"
                required
                className="mt-1 w-full rounded-xl border border-[#F3E8C8] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#F4B400] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="single-row" className="block text-xs font-semibold text-gray-700">
                  Row (min: 1)
                </label>
                <input
                  id="single-row"
                  type="number"
                  min="1"
                  value={singleRow}
                  onChange={(e) => setSingleRow(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-[#F3E8C8] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#F4B400] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="single-col" className="block text-xs font-semibold text-gray-700">
                  Column (min: 1)
                </label>
                <input
                  id="single-col"
                  type="number"
                  min="1"
                  value={singleCol}
                  onChange={(e) => setSingleCol(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-[#F3E8C8] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#F4B400] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="single-type" className="block text-xs font-semibold text-gray-700">
                Seat Type
              </label>
              <select
                id="single-type"
                value={singleType}
                onChange={(e) => setSingleType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#F3E8C8] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#F4B400] focus:outline-none"
              >
                <option value="regular">Regular</option>
                <option value="window">Window</option>
                <option value="premium">Premium</option>
                <option value="accessible">Accessible</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="single-active"
                type="checkbox"
                checked={singleActive}
                onChange={(e) => setSingleActive(e.target.checked)}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="single-active" className="text-xs font-medium text-gray-700">
                Seat is active and available for booking
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCloseSingleModal}
                disabled={singleSubmitting}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={singleSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F4B400] px-4 py-2 text-sm font-semibold text-[#1F2937] shadow-sm hover:bg-[#F59E0B] disabled:opacity-50"
              >
                {singleSubmitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Adding...
                  </>
                ) : (
                  "Add Seat"
                )}
              </button>
            </div>
          </form>
        </dialog>

        {/* =================================================================== */}
        {/* MODAL 3: Seat Details, Edit & Management Modal                       */}
        {/* =================================================================== */}
        <dialog
          ref={editDialogRef}
          aria-labelledby="edit-seat-title"
          className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-2xl border border-[#F3E8C8] bg-white p-6 shadow-2xl backdrop:bg-gray-900/40"
        >
          {selectedSeat && (
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <h2 id="edit-seat-title" className="text-lg font-bold text-[#1F2937]">
                    Seat {selectedSeat.seatNumber}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      selectedSeat.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedSeat.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitEditSeat} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="edit-seat-number" className="block text-xs font-semibold text-gray-700">
                    Seat Number
                  </label>
                  <input
                    id="edit-seat-number"
                    type="text"
                    value={editSeatNumber}
                    onChange={(e) => setEditSeatNumber(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-[#F3E8C8] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#F4B400] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="edit-row" className="block text-xs font-semibold text-gray-700">
                      Row
                    </label>
                    <input
                      id="edit-row"
                      type="number"
                      min="1"
                      value={editRow}
                      onChange={(e) => setEditRow(e.target.value)}
                      required
                      className="mt-1 w-full rounded-xl border border-[#F3E8C8] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#F4B400] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-col" className="block text-xs font-semibold text-gray-700">
                      Column
                    </label>
                    <input
                      id="edit-col"
                      type="number"
                      min="1"
                      value={editCol}
                      onChange={(e) => setEditCol(e.target.value)}
                      required
                      className="mt-1 w-full rounded-xl border border-[#F3E8C8] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#F4B400] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-type" className="block text-xs font-semibold text-gray-700">
                    Seat Type
                  </label>
                  <select
                    id="edit-type"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#F3E8C8] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#F4B400] focus:outline-none"
                  >
                    <option value="regular">Regular</option>
                    <option value="window">Window</option>
                    <option value="premium">Premium</option>
                    <option value="accessible">Accessible</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="edit-active"
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="edit-active" className="text-xs font-medium text-gray-700">
                    Seat is active and available for booking
                  </label>
                </div>

                {/* Status Toggle Quick Button */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Quick Availability Status</p>
                      <p className="text-[11px] text-gray-500">
                        {selectedSeat.isActive
                          ? "Seat is currently active."
                          : "Seat is currently deactivated."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleSeatActive(selectedSeat)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        selectedSeat.isActive
                          ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {selectedSeat.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={handleDeleteSeat}
                    disabled={deleteSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deleteSubmitting ? "Deleting..." : "Delete Seat"}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCloseEditModal}
                      disabled={editSubmitting}
                      className="rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editSubmitting}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4B400] px-4 py-2 text-xs font-semibold text-[#1F2937] shadow-sm hover:bg-[#F59E0B] disabled:opacity-50"
                    >
                      {editSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </dialog>
      </PageContainer>
    </DashboardLayout>
  );
}
