import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import "./AdminDashboardPage.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.ts";
import { useProfile } from "../../hooks/ProfileContext.tsx";
import { Avatar } from "../../components/avatar/Avatar.tsx";
import searchIcon from "../../assets/search.svg";
import ErrorModal from "../../components/modals/error/ErrorModal.tsx";
import editIcon from "../../assets/edit-icon.svg";
import deleteIcon from "../../assets/delete-icon.svg";
import logoutIcon from "../../assets/logout.svg";
import { useAdminUserActions, useAdminUsers, useAdminModerators, useAdminModeratorActions } from "../../hooks/useAdminData.ts";
import ConfirmationModal from "../../components/modals/deleteConfirmation/DeleteConfirmationModal.tsx";
import UpdateProfileModal from "../../components/modals/updateProfile/UpdateProfileModal.tsx";
import Logo from "../../components/logo/Logo.tsx";
import { Role } from "../../types/role.ts";
import { useAdminDailyStats, useAdminMonthlyStats } from "../../hooks/useAdminData.ts";
import Chart from 'chart.js/auto';
import { ChartOptions, TooltipItem } from "chart.js";

export const AdminDashboardPage = () => {
    const [search, setSearch] = useState("");
    const [userSort, setUserSort] = useState<"registeredAt" | "name">("registeredAt");
    const [userOrder, setUserOrder] = useState<"asc" | "desc">("desc");
    const [modSort, setModSort] = useState<"joinedAt" | "name">("joinedAt");
    const [modOrder, setModOrder] = useState<"asc" | "desc">("desc");
    const [selectedTab, setSelectedTab] = useState<"users" | "moderators" | "statistics">("users");
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{
        id: number,
        type: "user" | "moderator",
        firstName: string,
        lastName: string
    } | null>(null);
    const [statsTimeRange, setStatsTimeRange] = useState<"days" | "months">("days");

    const [showUserEditModal, setShowUserEditModal] = useState(false);
    const [showModeratorEditModal, setShowModeratorEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedModerator, setSelectedModerator] = useState<any>(null);

    // Pagination state
    const [userOffset, setUserOffset] = useState(0);
    const [modOffset, setModOffset] = useState(0);
    const [hasMoreUsers, setHasMoreUsers] = useState(true);
    const [hasMoreModerators, setHasMoreModerators] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    // Refs for infinite scrolling
    const userListRef = useRef<HTMLDivElement>(null);
    const modListRef = useRef<HTMLDivElement>(null);
    const userObserverRef = useRef<IntersectionObserver | null>(null);
    const modObserverRef = useRef<IntersectionObserver | null>(null);
    const userLoaderRef = useRef<HTMLDivElement>(null);
    const modLoaderRef = useRef<HTMLDivElement>(null);

    const activityChartRef = useRef<HTMLCanvasElement>(null);
    const usersChartRef = useRef<HTMLCanvasElement>(null);
    const videosChartRef = useRef<HTMLCanvasElement>(null);
    const activityChartInstance = useRef<Chart | null>(null);
    const usersChartInstance = useRef<Chart | null>(null);
    const videosChartInstance = useRef<Chart | null>(null);

    const navigate = useNavigate();
    const { logout } = useAuth();
    const { profile: currentAdmin } = useProfile();

    const ITEMS_PER_PAGE = 20;

    const userQueryParams = useMemo(() => ({
        search: search || undefined,
        sort: userSort,
        order: userOrder,
        limit: ITEMS_PER_PAGE,
        offset: userOffset
    }), [search, userSort, userOrder, userOffset]);

    const modQueryParams = useMemo(() => ({
        search: search || undefined,
        sort: modSort,
        order: modOrder,
        limit: ITEMS_PER_PAGE,
        offset: modOffset
    }), [search, modSort, modOrder, modOffset]);

    const statsParams = useMemo(() => ({
        limit: 30,
        offset: 0,
    }), []);

    const { users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useAdminUsers(userQueryParams);
    const { moderators, loading: moderatorsLoading, error: moderatorsError, refetch: refetchModerators } = useAdminModerators(modQueryParams);
    const { dailyStats, loading: dailyStatsLoading, error: dailyStatsError } = useAdminDailyStats(statsParams);
    const { monthlyStats, loading: monthlyStatsLoading, error: monthlyStatsError } = useAdminMonthlyStats(statsParams);
    const { deleteUser, updateUserProfile, error: userActionError, loading: userActionLoading } = useAdminUserActions();
    const { deleteModerator, updateModeratorProfile, error: modActionError, loading: modActionLoading } = useAdminModeratorActions();

    // State to store all loaded users/moderators for infinite scrolling
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [allModerators, setAllModerators] = useState<any[]>([]);

    // Reset states when changing tabs
    useEffect(() => {
        if (selectedTab === "users") {
            // Make sure we refresh observers when changing to users tab
            setTimeout(() => {
                setupUserObserver();
            }, 100);
        } else if (selectedTab === "moderators") {
            // Make sure we refresh observers when changing to moderators tab
            setTimeout(() => {
                setupModObserver();
            }, 100);
        }
    }, [selectedTab]);

    // Update all users when new users are loaded
    useEffect(() => {
        if (usersLoading) return;

        if (userOffset === 0) {
            setAllUsers(users);
        } else if (users.length > 0) {
            setAllUsers(prev => [...prev, ...users]);
        }

        // Check if there might be more users
        setHasMoreUsers(users.length === ITEMS_PER_PAGE);
        setLoadingMore(false);

        // After initial data is loaded, setup observer
        if (initialLoad && selectedTab === "users") {
            setInitialLoad(false);
            setTimeout(() => {
                setupUserObserver();
            }, 100);
        }
    }, [users, usersLoading, userOffset]);

    // Update all moderators when new moderators are loaded
    useEffect(() => {
        if (moderatorsLoading) return;

        if (modOffset === 0) {
            setAllModerators(moderators);
        } else if (moderators.length > 0) {
            setAllModerators(prev => [...prev, ...moderators]);
        }

        // Check if there might be more moderators
        setHasMoreModerators(moderators.length === ITEMS_PER_PAGE);
        setLoadingMore(false);

        // After initial data is loaded, setup observer
        if (initialLoad && selectedTab === "moderators") {
            setInitialLoad(false);
            setTimeout(() => {
                setupModObserver();
            }, 100);
        }
    }, [moderators, moderatorsLoading, modOffset]);

    // Reset offsets when search or sort changes
    useEffect(() => {
        setUserOffset(0);
        setAllUsers([]);
        setInitialLoad(true);
    }, [search, userSort, userOrder]);

    useEffect(() => {
        setModOffset(0);
        setAllModerators([]);
        setInitialLoad(true);
    }, [search, modSort, modOrder]);

    // Setup intersection observer for infinite scrolling
    const setupUserObserver = useCallback(() => {
        if (userObserverRef.current) {
            userObserverRef.current.disconnect();
        }

        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        userObserverRef.current = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                if (hasMoreUsers && !usersLoading && !loadingMore) {
                    console.log("Loading more users...");
                    setLoadingMore(true);
                    setUserOffset(prev => prev + ITEMS_PER_PAGE);
                }
            }
        }, options);

        if (userLoaderRef.current) {
            userObserverRef.current.observe(userLoaderRef.current);
            console.log("User observer set up");
        } else {
            console.log("User loader ref not available");
        }
    }, [hasMoreUsers, usersLoading, loadingMore]);

    const setupModObserver = useCallback(() => {
        if (modObserverRef.current) {
            modObserverRef.current.disconnect();
        }

        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        modObserverRef.current = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                if (hasMoreModerators && !moderatorsLoading && !loadingMore) {
                    console.log("Loading more moderators...");
                    setLoadingMore(true);
                    setModOffset(prev => prev + ITEMS_PER_PAGE);
                }
            }
        }, options);

        if (modLoaderRef.current) {
            modObserverRef.current.observe(modLoaderRef.current);
            console.log("Moderator observer set up");
        } else {
            console.log("Moderator loader ref not available");
        }
    }, [hasMoreModerators, moderatorsLoading, loadingMore]);

    // Cleanup observers when component unmounts
    useEffect(() => {
        return () => {
            if (userObserverRef.current) {
                userObserverRef.current.disconnect();
            }
            if (modObserverRef.current) {
                modObserverRef.current.disconnect();
            }
        };
    }, []);

    const handleLogout = () => {
        logout("admin");
        navigate("/admin/login");
    };

    const handleEditUser = (userId: number) => {
        const user = allUsers.find(u => u.user_id === userId);
        if (user) {
            setSelectedUser(user);
            setShowUserEditModal(true);
        }
    };

    const handleEditModerator = (moderatorId: number) => {
        const moderator = allModerators.find(m => m.moderator_id === moderatorId);
        if (moderator) {
            setSelectedModerator(moderator);
            setShowModeratorEditModal(true);
        }
    };

    const handleUpdateUser = async (fields: { first_name: string; last_name: string; avatar?: File | null }) => {
        if (selectedUser) {
            try {
                const processedFields = { ...fields, avatar: fields.avatar === null ? undefined : fields.avatar };
                await updateUserProfile(selectedUser.user_id, processedFields);
                refetchUsers();
                setShowUserEditModal(false);
            } catch (error) {
                setShowErrorModal(true);
            }
        }
    };

    const handleUpdateModerator = async (fields: { first_name: string; last_name: string; avatar?: File | null }) => {
        if (selectedModerator) {
            try {
                const processedFields = { ...fields, avatar: fields.avatar === null ? undefined : fields.avatar };
                await updateModeratorProfile(selectedModerator.moderator_id, processedFields);
                refetchModerators();
                setShowModeratorEditModal(false);
            } catch (error) {
                setShowErrorModal(true);
            }
        }
    };

    const handleDeleteItem = (id: number, type: "user" | "moderator") => {
        if (type === "user") {
            const user = allUsers.find(u => u.user_id === id);
            if (user) setItemToDelete({ id, type, firstName: user.first_name, lastName: user.last_name });
        } else {
            const moderator = allModerators.find(m => m.moderator_id === id);
            if (moderator) setItemToDelete({ id, type, firstName: moderator.first_name, lastName: moderator.last_name });
        }
        setShowConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        let success = false;
        if (itemToDelete.type === "user") {
            success = await deleteUser(itemToDelete.id);
            if (success) {
                setUserOffset(0);
                setAllUsers([]);
                refetchUsers();
            }
        } else {
            success = await deleteModerator(itemToDelete.id);
            if (success) {
                setModOffset(0);
                setAllModerators([]);
                refetchModerators();
            }
        }
        setShowConfirmModal(false);
        setItemToDelete(null);
    };

    const handleAdd = () => {
        if (selectedTab === "users") navigate("/admin/user/add");
        else if (selectedTab === "moderators") navigate("/admin/moderator/add");
    };

    const setSortByUserRegisteredAt = () => { setUserSort("registeredAt"); setUserOrder("desc"); };
    const setSortByUserName = () => { setUserSort("name"); setUserOrder("asc"); };
    const setSortByModJoinedAt = () => { setModSort("joinedAt"); setModOrder("desc"); };
    const setSortByModName = () => { setModSort("name"); setModOrder("asc"); };

    const getErrorMessage = () => usersError || moderatorsError || userActionError || modActionError || dailyStatsError || monthlyStatsError || "";
    const isLoading = selectedTab === "users" ? usersLoading && userOffset === 0 : (selectedTab === "moderators" ? moderatorsLoading && modOffset === 0 : (dailyStatsLoading || monthlyStatsLoading));
    const hasError = !!(getErrorMessage());

    useEffect(() => {
        if (selectedTab !== "statistics") return;
        const renderCharts = () => {
            let labels: string[] = [];
            let activityData: number[] = [];
            let usersData: number[] = [];
            let videosData: number[] = [];

            if (statsTimeRange === "days" && dailyStats?.length) {
                const sortedDailyStats = [...dailyStats].sort((a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime());
                const last30Days = sortedDailyStats.slice(-30);
                labels = last30Days.map(stat => formatShortDate(stat.period_start));
                activityData = last30Days.map(stat => Math.round(stat.total_presentation_duration_seconds / 60));
                usersData = last30Days.map(stat => stat.total_users_count);
                videosData = last30Days.map(stat => stat.videos_recorded_count);
            } else if (statsTimeRange === "months" && monthlyStats?.length) {
                const sortedMonthlyStats = [...monthlyStats].sort((a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime());
                labels = sortedMonthlyStats.map(stat => new Date(stat.period_start).toLocaleDateString('uk-UA', { month: 'short', year: 'numeric' }));
                activityData = sortedMonthlyStats.map(stat => Math.round(stat.total_presentation_duration_seconds / 60));
                usersData = sortedMonthlyStats.map(stat => stat.total_users_count);
                videosData = sortedMonthlyStats.map(stat => stat.videos_recorded_count);
            }
            initActivityChart(labels, activityData);
            initUsersChart(labels, usersData);
            initVideosChart(labels, videosData);
        };
        renderCharts();
        return () => {
            if (activityChartInstance.current) activityChartInstance.current.destroy();
            if (usersChartInstance.current) usersChartInstance.current.destroy();
            if (videosChartInstance.current) videosChartInstance.current.destroy();
        };
    }, [selectedTab, statsTimeRange, dailyStats, monthlyStats]);

    const commonChartOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0, 0, 0, 0.08)' },
                ticks: { color: '#666', font: { size: 10 } },
            },
            x: {
                grid: { display: false },
                ticks: { color: '#666', font: { size: 10 }, maxRotation: 0, minRotation: 0 },
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                    boxWidth: 12,
                    usePointStyle: true,
                    pointStyle: 'rect',
                    padding: 20,
                    color: '#333',
                    font: { size: 12 }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.7)',
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                callbacks: {
                    label: function(context: TooltipItem<any>) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) label += context.parsed.y;
                        return label;
                    }
                }
            }
        }
    };

    const initActivityChart = (labels: string[], data: number[]) => {
        if (!activityChartRef.current) return;
        if (activityChartInstance.current) activityChartInstance.current.destroy();
        const ctx = activityChartRef.current.getContext('2d');
        if (!ctx) return;
        activityChartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Загальна тривалість (хвилини)',
                    data: data,
                    backgroundColor: '#5E806F',
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.7
                }]
            },
            options: commonChartOptions as ChartOptions<'bar'>,
        });
    };

    const initUsersChart = (labels: string[], data: number[]) => {
        if (!usersChartRef.current) return;
        if (usersChartInstance.current) usersChartInstance.current.destroy();
        const ctx = usersChartRef.current.getContext('2d');
        if (!ctx) return;
        usersChartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Загальна кількість користувачів',
                    data: data,
                    fill: false,
                    borderColor: '#4BAAA8',
                    backgroundColor: '#4BAAA8',
                    tension: 0.1,
                    pointRadius: 3,
                    pointBackgroundColor: '#4BAAA8',
                    borderWidth: 2,
                }]
            },
            options: commonChartOptions as ChartOptions<'line'>,
        });
    };

    const initVideosChart = (labels: string[], data: number[]) => {
        if (!videosChartRef.current) return;
        if (videosChartInstance.current) videosChartInstance.current.destroy();
        const ctx = videosChartRef.current.getContext('2d');
        if (!ctx) return;
        videosChartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Нові записи',
                    data: data,
                    borderColor: '#F8A055',
                    backgroundColor: '#F8A055',
                    tension: 0.1,
                    pointRadius: 3,
                    pointBackgroundColor: '#F8A055',
                    borderWidth: 2,
                }]
            },
            options: commonChartOptions as ChartOptions<'line'>,
        });
    };

    const getStatsSummary = () => {
        if (!monthlyStats?.length && !dailyStats?.length) {
            return { totalUsers: 0, totalDuration: 0, totalVideos: 0 };
        }
        const sourceStats = monthlyStats?.length ? monthlyStats : dailyStats;
        const lastStat = sourceStats[sourceStats.length -1];

        return {
            totalUsers: lastStat?.total_users_count || 0,
            totalDuration: Math.round((lastStat?.total_presentation_duration_seconds || 0) / 60),
            totalVideos: lastStat?.videos_recorded_count || 0
        };
    };

    const statsSummary = getStatsSummary();

    const formatShortDate = (dateStr?: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }).replace('.', '');
    };

    // Force trigger scroll event after render to help intersection observer
    useEffect(() => {
        const triggerScroll = () => {
            window.dispatchEvent(new CustomEvent('scroll'));
        };

        // Trigger after a small delay to ensure everything is rendered
        const timeoutId = setTimeout(triggerScroll, 300);
        return () => clearTimeout(timeoutId);
    }, [allUsers.length, allModerators.length, selectedTab]);

    return (
        <div className="admin-dashboard-container">
            <header className="admin-header">
                <div className="header-left">
                    <Logo role={Role.Admin} />
                </div>
                <div className="header-right">
                    <div className="logout-button" onClick={handleLogout}>
                        <img src={logoutIcon} alt="Вихід" />
                    </div>
                </div>
            </header>

            <div className="admin-main">
                <aside className="admin-sidebar">
                    <nav className="admin-nav">
                        <div className={`nav-item ${selectedTab === "users" ? "active" : ""}`} onClick={() => setSelectedTab("users")}>Користувачі</div>
                        <div className={`nav-item ${selectedTab === "moderators" ? "active" : ""}`} onClick={() => setSelectedTab("moderators")}>Модератори</div>
                        <div className={`nav-item ${selectedTab === "statistics" ? "active" : ""}`} onClick={() => setSelectedTab("statistics")}>Статистики</div>
                    </nav>
                </aside>

                <main className="admin-content">
                    <div className="content-header">
                        <h1 className="page-title">
                            {selectedTab === "users" ? "Користувачі" : selectedTab === "moderators" ? "Модератори" : "Статистики"}
                        </h1>
                    </div>

                    {selectedTab !== "statistics" && (
                        <div className="search-and-filters-container">
                            <div className="search-box">
                                <img src={searchIcon} alt="Пошук" className="search-icon" />
                                <input type="text" placeholder={selectedTab === "users" ? "Пошук користувачів..." : "Пошук модераторів..."} className="search-input" value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                            <div className="sort-by-registered">
                                <button className={`filter-tab ${(selectedTab === "users" ? userSort : modSort) === (selectedTab === "users" ? "registeredAt" : "joinedAt") ? "active" : ""}`} onClick={selectedTab === "users" ? setSortByUserRegisteredAt : setSortByModJoinedAt}>{selectedTab === "users" ? "Останні зареєстровані" : "Останні додані"}</button>
                            </div>
                            <button className={`filter-tab ${(selectedTab === "users" ? userSort : modSort) === "name" ? "active" : ""}`} onClick={selectedTab === "users" ? setSortByUserName : setSortByModName}>За алфавітом</button>
                        </div>
                    )}

                    {selectedTab === "users" && (
                        <div className="content-list">
                            {isLoading ? <div className="loading-state">Завантаження...</div> : allUsers.length === 0 ? <div className="empty-state">Користувачів не знайдено</div> : (
                                <div className="scrollable-container">
                                    <div className="items-list" ref={userListRef}>
                                        {allUsers.map(user => (
                                            <div key={user.user_id} className="list-item">
                                                <div className="item-info">
                                                    <Avatar src={user.avatar ? import.meta.env.VITE_APP_API_BASE_URL + user.avatar : null} alt={user.first_name} size={40} />
                                                    <div className="item-details">
                                                        <div className="item-name">{user.first_name} {user.last_name}</div>
                                                        <div className="item-subtitle">{user.has_premium ? "Преміум" : "Не преміум"}</div>
                                                    </div>
                                                </div>
                                                <div className="item-email">{user.email}</div>
                                                <div className="item-date">
                                                    <div className="date-label">Реєстрація:</div>
                                                    <div className="date-value">{formatDate(user.registered_at)}</div>
                                                </div>
                                                <div className="item-actions">
                                                    <button className="action-btn edit-btn" onClick={() => handleEditUser(user.user_id)} aria-label="Редагувати користувача"><img src={editIcon} alt="Редагувати" /></button>
                                                    <button className="action-btn delete-btn" onClick={() => handleDeleteItem(user.user_id, "user")} aria-label="Видалити користувача"><img src={deleteIcon} alt="Видалити" /></button>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Loading indicator for infinite scroll */}
                                        <div
                                            ref={userLoaderRef}
                                            className="loading-more"
                                            style={{ display: hasMoreUsers ? 'flex' : 'none' }}
                                        >
                                            {loadingMore && <div className="spinner"></div>}
                                            {!loadingMore && hasMoreUsers && <div className="scroll-hint">Прокрутіть для завантаження більше</div>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedTab === "moderators" && (
                        <div className="content-list">
                            {isLoading ? <div className="loading-state">Завантаження...</div> : allModerators.length === 0 ? <div className="empty-state">Модераторів не знайдено</div> : (
                                <div className="scrollable-container">
                                    <div className="items-list" ref={modListRef}>
                                        {allModerators.map(moderator => (
                                            <div key={moderator.moderator_id} className="list-item">
                                                <div className="item-info">
                                                    <Avatar src={moderator.avatar ? import.meta.env.VITE_APP_API_BASE_URL + moderator.avatar : null} alt={moderator.first_name} size={40} />
                                                    <div className="item-details">
                                                        <div className="item-name">{moderator.first_name} {moderator.last_name}</div>
                                                    </div>
                                                </div>
                                                <div className="item-email">{moderator.email}</div>
                                                <div className="item-date">
                                                    <div className="date-label">Приєднався:</div>
                                                    <div className="date-value">{formatDate(moderator.joined_at)}</div>
                                                </div>
                                                <div className="item-actions">
                                                    <button className="action-btn edit-btn" onClick={() => handleEditModerator(moderator.moderator_id)} aria-label="Редагувати модератора"><img src={editIcon} alt="Редагувати" /></button>
                                                    <button className="action-btn delete-btn" onClick={() => handleDeleteItem(moderator.moderator_id, "moderator")} aria-label="Видалити модератора"><img src={deleteIcon} alt="Видалити" /></button>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Loading indicator for infinite scroll */}
                                        <div
                                            ref={modLoaderRef}
                                            className="loading-more"
                                            style={{ display: hasMoreModerators ? 'flex' : 'none' }}
                                        >
                                            {loadingMore && <div className="spinner"></div>}
                                            {!loadingMore && hasMoreModerators && <div className="scroll-hint">Прокрутіть для завантаження більше</div>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedTab === "statistics" && (
                        <>
                            {isLoading ? <div className="loading-state">Завантаження даних статистики...</div> : (
                                <>
                                    <div className="stats-grid">
                                        <div className="stats-card">
                                            <h3 className="stats-card-title">Тривалість презентацій</h3>
                                            <div className="chart-container"><canvas ref={activityChartRef}></canvas></div>
                                        </div>
                                        <div className="stats-card">
                                            <h3 className="stats-card-title">Зростання кількості користувачів</h3>
                                            <div className="chart-container"><canvas ref={usersChartRef}></canvas></div>
                                        </div>
                                        <div className="stats-card">
                                            <h3 className="stats-card-title">Записані відео</h3>
                                            <div className="chart-container"><canvas ref={videosChartRef}></canvas></div>
                                        </div>
                                        <div className="stats-card stats-summary-card">
                                            <div className="stats-summary-item">
                                                <div className="stats-summary-icon user-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="24" height="24"><path d="M12,12c2.21,0 4,-1.79 4,-4s-1.79,-4 -4,-4 -4,1.79 -4,4 1.79,4 4,4zM12,14c-2.67,0 -8,1.34 -8,4v2h16v-2c0,-2.66 -5.33,-4 -8,-4z"/></svg>
                                                </div>
                                                <div className="stats-summary-content">
                                                    <h4>Загальна кількість користувачів</h4>
                                                    <div className="stats-summary-value">{statsSummary.totalUsers}</div>
                                                </div>
                                            </div>
                                            <div className="stats-summary-item">
                                                <div className="stats-summary-icon presentation-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                                                </div>
                                                <div className="stats-summary-content">
                                                    <h4>Загальна тривалість презентацій</h4>
                                                    <div className="stats-summary-value">{statsSummary.totalDuration} хв</div>
                                                </div>
                                            </div>
                                            <div className="stats-summary-item">
                                                <div className="stats-summary-icon video-icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="24" height="24"><path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/></svg>
                                                </div>
                                                <div className="stats-summary-content">
                                                    <h4>Загальна кількість записів</h4>
                                                    <div className="stats-summary-value">{statsSummary.totalVideos}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="stats-time-selector">
                                        <button className={`time-range-btn ${statsTimeRange === "days" ? "active" : ""}`} onClick={() => setStatsTimeRange("days")}>Дні</button>
                                        <button className={`time-range-btn ${statsTimeRange === "months" ? "active" : ""}`} onClick={() => setStatsTimeRange("months")}>Місяці</button>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {selectedTab !== "statistics" && (
                        <button className="fab" onClick={handleAdd} aria-label="Додати">+</button>
                    )}
                </main>
            </div>

            {selectedUser && <UpdateProfileModal initialProfile={{first_name: selectedUser.first_name, last_name: selectedUser.last_name, avatar: selectedUser.avatar}} open={showUserEditModal} onClose={() => { setShowUserEditModal(false); setSelectedUser(null);}} onSave={handleUpdateUser} loading={userActionLoading}/>}
            {selectedModerator && <UpdateProfileModal initialProfile={{first_name: selectedModerator.first_name, last_name: selectedModerator.last_name, avatar: selectedModerator.avatar}} open={showModeratorEditModal} onClose={() => { setShowModeratorEditModal(false); setSelectedModerator(null);}} onSave={handleUpdateModerator} loading={modActionLoading}/>}
            <ErrorModal show={showErrorModal || hasError} onClose={() => setShowErrorModal(false)} message={getErrorMessage()}/>
            <ConfirmationModal open={showConfirmModal} onClose={() => { setShowConfirmModal(false); setItemToDelete(null);}} onConfirm={confirmDelete} confirmationTitle="" confirmationDescription={itemToDelete ? `Ви впевнені, що хочете видалити ${itemToDelete.type === "user" ? "користувача" : "модератора"} ${itemToDelete.firstName} ${itemToDelete.lastName}?` : ""}/>
        </div>
    );
};

function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, '.');
}

export default AdminDashboardPage;