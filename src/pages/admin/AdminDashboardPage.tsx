import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import "./AdminDashboardPage.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.ts";
import { Avatar } from "../../components/avatar/Avatar.tsx";
import searchIcon from "../../assets/search.svg";
import ErrorModal from "../../components/modals/error/ErrorModal.tsx";
import editIcon from "../../assets/edit-icon.svg";
import deleteIcon from "../../assets/delete-icon.svg";
import logoutIcon from "../../assets/logout.svg";
import userIcon from "../../assets/user-icon.svg";
import whiteTimeIcon from "../../assets/white-time-icon.svg";
import videoIcon from "../../assets/video-icon.svg";
import {
    useAdminUserActions,
    useAdminUsers,
    useAdminModerators,
    useAdminModeratorActions,
    useAdminDailyStats, useAdminMonthlyStats, useAdminTotalStats
} from "../../hooks/useAdminData.ts";
import ConfirmationModal from "../../components/modals/deleteConfirmation/DeleteConfirmationModal.tsx";
import UpdateProfileModal from "../../components/modals/updateProfile/UpdateProfileModal.tsx";
import Logo from "../../components/logo/Logo.tsx";
import { Role } from "../../types/role.ts";
import Chart from 'chart.js/auto';
import { ChartOptions, TooltipItem } from "chart.js";
import {UpdateModeratorProfileRequest, UpdateUserProfileRequest} from "../../api/repositories/adminRepository.ts";
import AdminInvite from "../../components/modals/adminInvite/AdminInvite.tsx";
import { Title } from 'react-head';

const ITEMS_PER_PAGE = 20;

export const AdminDashboardPage = () => {
    const [selectedTab, setSelectedTab] = useState<"users" | "moderators" | "statistics">(() => {
        const storedTab = localStorage.getItem("adminDashboardSelectedTab");
        if (storedTab === "users" || storedTab === "moderators" || storedTab === "statistics") {
            return storedTab;
        }
        return "users";
    });

    const [search, setSearch] = useState("");
    const [userSort, setUserSort] = useState<"registeredAt" | "name">("registeredAt");
    const [userOrder, setUserOrder] = useState<"asc" | "desc">("desc");
    const [modSort, setModSort] = useState<"joinedAt" | "name">("joinedAt");
    const [modOrder, setModOrder] = useState<"asc" | "desc">("desc");

    const [userOffset, setUserOffset] = useState(0);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [hasMoreUsers, setHasMoreUsers] = useState(true);

    const [userRefreshTrigger, setUserRefreshTrigger] = useState(0);
    const [modRefreshTrigger, setModRefreshTrigger] = useState(0);

    const isLoadingMoreUsersRef = useRef(false);

    const [modOffset, setModOffset] = useState(0);
    const [allModerators, setAllModerators] = useState<any[]>([]);
    const [hasMoreModerators, setHasMoreModerators] = useState(true);

    const isLoadingMoreModeratorsRef = useRef(false);

    const [showUserEditModal, setShowUserEditModal] = useState(false);
    const [showModeratorEditModal, setShowModeratorEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedModerator, setSelectedModerator] = useState<any>(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{
        id: number,
        type: "user" | "moderator",
        firstName: string,
        lastName: string
    } | null>(null);

    const [showUserInviteModal, setShowUserInviteModal] = useState(false);
    const [showModeratorInviteModal, setShowModeratorInviteModal] = useState(false);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [userInviteKey, setUserInviteKey] = useState(0);
    const [moderatorInviteKey, setModeratorInviteKey] = useState(0);

    const [statsTimeRange, setStatsTimeRange] = useState<"days" | "months">("days");
    const activityChartRef = useRef<HTMLCanvasElement>(null);
    const usersChartRef = useRef<HTMLCanvasElement>(null);
    const videosChartRef = useRef<HTMLCanvasElement>(null);
    const activityChartInstance = useRef<Chart | null>(null);
    const usersChartInstance = useRef<Chart | null>(null);
    const videosChartInstance = useRef<Chart | null>(null);

    const userContainerRef = useRef<HTMLDivElement>(null);
    const modContainerRef = useRef<HTMLDivElement>(null);
    const userLoaderRef = useRef<HTMLDivElement>(null);
    const modLoaderRef = useRef<HTMLDivElement>(null);
    const userObserverRef = useRef<IntersectionObserver | null>(null);
    const modObserverRef = useRef<IntersectionObserver | null>(null);

    const navigate = useNavigate();
    const { logout } = useAuth();
    const { deleteUser, updateUserProfile, inviteUser, error: userActionError, loading: userActionLoading, resetError: resetUserActionError } = useAdminUserActions();
    const { deleteModerator, updateModeratorProfile, inviteModerator, error: modActionError, loading: modActionLoading, resetError: resetModActionError } = useAdminModeratorActions();

    const userQueryParams = useMemo(() => ({
        search: search || undefined,
        sort: userSort,
        order: userOrder,
        limit: ITEMS_PER_PAGE,
        offset: userOffset,
        refresh: userRefreshTrigger
    }), [search, userSort, userOrder, userOffset, userRefreshTrigger]);
    const { users, loading: usersLoadingFromHook, error: usersError} = useAdminUsers(userQueryParams);

    const modQueryParams = useMemo(() => ({
        search: search || undefined,
        sort: modSort,
        order: modOrder,
        limit: ITEMS_PER_PAGE,
        offset: modOffset,
        refresh: modRefreshTrigger
    }), [search, modSort, modOrder, modOffset, modRefreshTrigger]);
    const { moderators, loading: moderatorsLoadingFromHook, error: moderatorsError } = useAdminModerators(modQueryParams);

    const statsParams = useMemo(() => ({ limit: 30, offset: 0 }), []);
    const { dailyStats, loading: dailyStatsLoading, error: dailyStatsError } = useAdminDailyStats(statsParams);
    const { monthlyStats, loading: monthlyStatsLoading, error: monthlyStatsError } = useAdminMonthlyStats(statsParams);
    const { totalStats, loading: totalStatsLoading, error: totalStatsError } = useAdminTotalStats();

    useEffect(() => {
        localStorage.setItem("adminDashboardSelectedTab", selectedTab);
    }, [selectedTab]);

    const setupUserObserver = useCallback(() => {
        if (userObserverRef.current) userObserverRef.current.disconnect();

        if (!userLoaderRef.current || !userContainerRef.current || !hasMoreUsers) return;

        userObserverRef.current = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (
                    entry?.isIntersecting &&
                    hasMoreUsers &&
                    !usersLoadingFromHook &&
                    !isLoadingMoreUsersRef.current
                ) {
                    isLoadingMoreUsersRef.current = true;
                    setUserOffset(prevOffset => prevOffset + ITEMS_PER_PAGE);
                }
            },
            {
                root: userContainerRef.current,
                rootMargin: '0px 0px 300px 0px',
                threshold: 0.1
            }
        );
        userObserverRef.current.observe(userLoaderRef.current);
    }, [hasMoreUsers, usersLoadingFromHook, userOffset]);


    const setupModObserver = useCallback(() => {
        if (modObserverRef.current) modObserverRef.current.disconnect();

        if (!modLoaderRef.current || !modContainerRef.current || !hasMoreModerators) return;

        modObserverRef.current = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (
                    entry?.isIntersecting &&
                    hasMoreModerators &&
                    !moderatorsLoadingFromHook &&
                    !isLoadingMoreModeratorsRef.current
                ) {
                    isLoadingMoreModeratorsRef.current = true;
                    setModOffset(prevOffset => prevOffset + ITEMS_PER_PAGE);
                }
            },
            {
                root: modContainerRef.current,
                rootMargin: '0px 0px 300px 0px',
                threshold: 0.1
            }
        );
        modObserverRef.current.observe(modLoaderRef.current);
    }, [hasMoreModerators, moderatorsLoadingFromHook, modOffset]);


    useEffect(() => {
        if (userObserverRef.current) {
            userObserverRef.current.disconnect();
        }
        setAllUsers([]);
        setUserOffset(0);
        setHasMoreUsers(true);
        isLoadingMoreUsersRef.current = false;
    }, [search, userSort, userOrder]);

    useEffect(() => {
        if (selectedTab === "users") {
            if (!usersLoadingFromHook && users) {
                isLoadingMoreUsersRef.current = false;

                if (userOffset === 0) {
                    setAllUsers(users);
                } else {
                    setAllUsers(prevUsers => {
                        const newUsersToAdd = users.filter(newUser =>
                            !prevUsers.some(u => u.user_id === newUser.user_id)
                        );
                        return [...prevUsers, ...newUsersToAdd];
                    });
                }

                setHasMoreUsers(users.length === ITEMS_PER_PAGE);
            }

            const timerId = setTimeout(() => {
                setupUserObserver();
            }, 100);

            return () => clearTimeout(timerId);
        }
    }, [users, usersLoadingFromHook, userOffset, setupUserObserver, selectedTab]);

    useEffect(() => {
        if (modObserverRef.current) {
            modObserverRef.current.disconnect();
        }
        setAllModerators([]);
        setModOffset(0);
        setHasMoreModerators(true);
        isLoadingMoreModeratorsRef.current = false;
    }, [search, modSort, modOrder]);

    useEffect(() => {
        if (selectedTab === "moderators") {
            if (!moderatorsLoadingFromHook && moderators) {
                isLoadingMoreModeratorsRef.current = false;

                if (modOffset === 0) {
                    setAllModerators(moderators);
                } else {
                    setAllModerators(prevModerators => {
                        const newModsToAdd = moderators.filter(newMod =>
                            !prevModerators.some(m => m.moderator_id === newMod.moderator_id)
                        );
                        return [...prevModerators, ...newModsToAdd];
                    });
                }

                setHasMoreModerators(moderators.length === ITEMS_PER_PAGE);
            }

            const timerId = setTimeout(() => {
                setupModObserver();
            }, 100);

            return () => clearTimeout(timerId);
        }
    }, [moderators, moderatorsLoadingFromHook, modOffset, setupModObserver, selectedTab]);

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

    useEffect(() => {
        if (userObserverRef.current) {
            userObserverRef.current.disconnect();
        }
        if (modObserverRef.current) {
            modObserverRef.current.disconnect();
        }

        if (selectedTab === "users") {
            setTimeout(() => setupUserObserver(), 100);
        } else if (selectedTab === "moderators") {
            setTimeout(() => setupModObserver(), 100);
        }
    }, [selectedTab, setupUserObserver, setupModObserver]);

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
            const payload: UpdateUserProfileRequest = {
                first_name: fields.first_name,
                last_name: fields.last_name,
                ...(fields.avatar !== null ? { avatar: fields.avatar } : {})
            };
            const updated = await updateUserProfile(selectedUser.user_id, payload);
            setShowUserEditModal(false);
            setSelectedUser(null);
            if (updated) {
                setAllUsers(prev => prev.map(u => u.user_id === updated.user_id ? { ...u, ...updated } : u));
            }
        }
    };

    const handleUpdateModerator = async (fields: { first_name: string; last_name: string; avatar?: File | null }) => {
        if (selectedModerator) {
            const payload: UpdateModeratorProfileRequest = {
                first_name: fields.first_name,
                last_name: fields.last_name,
                ...(fields.avatar !== null ? { avatar: fields.avatar } : {})
            };
            const updated = await updateModeratorProfile(selectedModerator.moderator_id, payload);
            setShowModeratorEditModal(false);
            setSelectedModerator(null);
            if (updated) {
                setAllModerators(prev => prev.map(m => m.moderator_id === updated.moderator_id ? { ...m, ...updated } : m));
            }
        }
    };

    const handleSendUserInvite = async (data: { first_name: string; last_name: string; email: string }) => {
        setInviteLoading(true);
        try {
            await inviteUser(data);
            setShowUserInviteModal(false);
            setAllUsers([]);
            setUserOffset(0);
            isLoadingMoreUsersRef.current = false;
            setUserRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
            setShowUserInviteModal(false);
            if (error.status === 409) {
                setErrorMessage("Користувач з такою адресою електронної пошти вже зареєстрований");
            } else {
                setErrorMessage("Помилка при надсиланні запрошення");
            }
            setShowErrorModal(true);
        } finally {
            setInviteLoading(false);
        }
    };

    const handleSendModeratorInvite = async (data: { first_name: string; last_name: string; email: string }) => {
        setInviteLoading(true);
        try {
            await inviteModerator(data);
            setShowModeratorInviteModal(false);
            setAllModerators([]);
            setModOffset(0);
            isLoadingMoreModeratorsRef.current = false;
            setModRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
            setShowModeratorInviteModal(false);
            if (error.status === 409) {
                setErrorMessage("Користувач з такою адресою електронної пошти вже зареєстрований");
            } else {
                setErrorMessage("Помилка при надсиланні запрошення");
            }
            setShowErrorModal(true);
        } finally {
            setInviteLoading(false);
        }
    };

    const clearAllErrors = () => {
        setShowErrorModal(false);
        setErrorMessage("");
        resetUserActionError();
        resetModActionError();
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
        let success;
        if (itemToDelete.type === "user") {
            success = await deleteUser(itemToDelete.id);
            if (success) {
                setAllUsers([]);
                setUserOffset(0);
                isLoadingMoreUsersRef.current = false;
                setUserRefreshTrigger(prev => prev + 1);
            }
        } else {
            success = await deleteModerator(itemToDelete.id);
            if (success) {
                setAllModerators([]);
                setModOffset(0);
                isLoadingMoreModeratorsRef.current = false;
                setModRefreshTrigger(prev => prev + 1);
            }
        }
        setShowConfirmModal(false);
        setItemToDelete(null);
    };

    const handleAdd = () => {
        if (selectedTab === "users") {
            setUserInviteKey(prev => prev + 1);
            setShowUserInviteModal(true);
        } else if (selectedTab === "moderators") {
            setModeratorInviteKey(prev => prev + 1);
            setShowModeratorInviteModal(true);
        }
    };

    const setSortByUserRegisteredAt = () => {
        setUserSort("registeredAt");
        setUserOrder("desc");
    };

    const setSortByUserName = () => {
        setUserSort("name");
        setUserOrder("asc");
    };

    const setSortByModJoinedAt = () => {
        setModSort("joinedAt");
        setModOrder("desc");
    };

    const setSortByModName = () => {
        setModSort("name");
        setModOrder("asc");
    };

    const getErrorMessage = () => errorMessage || usersError || moderatorsError || userActionError || modActionError || dailyStatsError || monthlyStatsError || totalStatsError || "";

    const isLoading =
        selectedTab === "users"
            ? usersLoadingFromHook && userOffset === 0
            : selectedTab === "moderators"
                ? moderatorsLoadingFromHook && modOffset === 0
                : (dailyStatsLoading || monthlyStatsLoading || totalStatsLoading);

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
            y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.08)' }, ticks: { color: '#666', font: { size: 10 } }, },
            x: { grid: { display: false }, ticks: { color: '#666', font: { size: 10 }, maxRotation: 0, minRotation: 0 }, }
        },
        plugins: {
            legend: { display: true, position: 'top', align: 'start', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'rect', padding: 20, color: '#333', font: { size: 12 } } },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.7)',
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                callbacks: {
                    label: function (context: TooltipItem<any>) {
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
        if (totalStats) {
            return {
                totalUsers: totalStats.total_users_count,
                totalDuration: Math.round(totalStats.total_presentation_duration_seconds / 60),
                totalVideos: totalStats.videos_recorded_count
            };
        }
        if (!monthlyStats?.length && !dailyStats?.length) {
            return { totalUsers: 0, totalDuration: 0, totalVideos: 0 };
        }
        const sourceStats = monthlyStats?.length ? monthlyStats : (dailyStats || []);
        if (sourceStats.length === 0) return { totalUsers: 0, totalDuration: 0, totalVideos: 0 };
        const lastStat = sourceStats[sourceStats.length - 1];
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

    return (
        <div className="admin-dashboard-container">
            <Title>Сторінка адміністратора – ScriptGlance</Title>
            <header className="admin-header">
                <div className="admin-header-left">
                    <Logo role={Role.Admin} />
                </div>
                <div className="admin-header-right">
                    <div className="admin-logout-button" onClick={handleLogout}>
                        <img src={logoutIcon} alt="Вихід" />
                    </div>
                </div>
            </header>

            <div className="admin-main">
                <aside className="admin-sidebar">
                    <nav className="admin-nav">
                        <div className={`admin-nav-item ${selectedTab === "users" ? "active" : ""}`} onClick={() => setSelectedTab("users")}>Користувачі</div>
                        <div className={`admin-nav-item ${selectedTab === "moderators" ? "active" : ""}`} onClick={() => setSelectedTab("moderators")}>Модератори</div>
                        <div className={`admin-nav-item ${selectedTab === "statistics" ? "active" : ""}`} onClick={() => setSelectedTab("statistics")}>Статистики</div>
                    </nav>
                </aside>

                <main className="admin-content">
                    <div className="admin-content-header">
                        <h1 className="admin-page-title">
                            {selectedTab === "users" ? "Користувачі" : selectedTab === "moderators" ? "Модератори" : "Статистики"}
                        </h1>
                    </div>

                    {selectedTab !== "statistics" && (
                        <div className="admin-search-filters-container">
                            <div className="admin-search-box">
                                <img src={searchIcon} alt="Пошук" className="admin-search-icon" />
                                <input type="text" placeholder={selectedTab === "users" ? "Пошук користувачів..." : "Пошук модераторів..."} className="admin-search-input" value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                            <div className="admin-sort-by-registered">
                                <button className={`admin-filter-tab ${(selectedTab === "users" ? userSort : modSort) === (selectedTab === "users" ? "registeredAt" : "joinedAt") ? "active" : ""}`} onClick={selectedTab === "users" ? setSortByUserRegisteredAt : setSortByModJoinedAt}>{selectedTab === "users" ? "Останні зареєстровані" : "Останні додані"}</button>
                            </div>
                            <button className={`admin-filter-tab ${(selectedTab === "users" ? userSort : modSort) === "name" ? "active" : ""}`} onClick={selectedTab === "users" ? setSortByUserName : setSortByModName}>За алфавітом</button>
                        </div>
                    )}

                    {selectedTab === "users" && (
                        <div className="admin-content-list">
                            {isLoading ? <div className="admin-loading-state">Завантаження...</div> : allUsers.length === 0 && !usersLoadingFromHook ? <div className="admin-empty-state">Користувачів не знайдено</div> : (
                                <div className="admin-scrollable-container" ref={userContainerRef}>
                                    <div className="admin-items-list">
                                        {allUsers.map(user => (
                                            <div key={`user-${user.user_id}`} className="admin-list-item">
                                                <div className="admin-item-info">
                                                    <Avatar src={user.avatar ? import.meta.env.VITE_APP_API_BASE_URL + user.avatar : null} alt={user.first_name + " " + user.last_name} name={user.first_name} surname={user.last_name} size={40} />
                                                    <div className="admin-item-details">
                                                        <div className="admin-item-name">{user.first_name} {user.last_name}</div>
                                                        <div className="admin-item-subtitle">{user.has_premium ? "Преміум" : "Не преміум"}</div>
                                                    </div>
                                                </div>
                                                <div className="admin-item-email">{user.email}</div>
                                                <div className="admin-item-date">
                                                    <div className="admin-date-label">Реєстрація:</div>
                                                    <div className="admin-date-value">{formatDate(user.registered_at)}</div>
                                                </div>
                                                <div className="admin-item-actions">
                                                    <button className="admin-action-btn admin-edit-btn" onClick={() => handleEditUser(user.user_id)} aria-label="Редагувати користувача"><img src={editIcon} alt="Редагувати" /></button>
                                                    <button className="admin-action-btn admin-delete-btn" onClick={() => handleDeleteItem(user.user_id, "user")} aria-label="Видалити користувача"><img src={deleteIcon} alt="Видалити" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {hasMoreUsers && (
                                        <div ref={userLoaderRef} className="admin-list-loader">
                                            {usersLoadingFromHook && userOffset > 0 && <div className="admin-spinner"></div>}
                                            {!usersLoadingFromHook && <div className="admin-loader-text">Завантаження більше користувачів...</div>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {selectedTab === "moderators" && (
                        <div className="admin-content-list">
                            {isLoading ? <div className="admin-loading-state">Завантаження...</div> : allModerators.length === 0 && !moderatorsLoadingFromHook ? <div className="admin-empty-state">Модераторів не знайдено</div> : (
                                <div className="admin-scrollable-container" ref={modContainerRef}>
                                    <div className="admin-items-list">
                                        {allModerators.map(moderator => (
                                            <div key={`mod-${moderator.moderator_id}`} className="admin-list-item">
                                                <div className="admin-item-info">
                                                    <Avatar src={moderator.avatar ? import.meta.env.VITE_APP_API_BASE_URL + moderator.avatar : undefined} alt={moderator.first_name + " " + moderator.last_name} name={moderator.first_name} surname={moderator.last_name} size={40} />
                                                    <div className="admin-item-details">
                                                        <div className="admin-item-name">{moderator.first_name} {moderator.last_name}</div>
                                                    </div>
                                                </div>
                                                <div className="admin-item-email">{moderator.email}</div>
                                                <div className="admin-item-date">
                                                    <div className="admin-date-label">Приєднався:</div>
                                                    <div className="admin-date-value">{formatDate(moderator.joined_at)}</div>
                                                </div>
                                                <div className="admin-item-actions">
                                                    <button className="admin-action-btn admin-edit-btn" onClick={() => handleEditModerator(moderator.moderator_id)} aria-label="Редагувати модератора"><img src={editIcon} alt="Редагувати" /></button>
                                                    <button className="admin-action-btn admin-delete-btn" onClick={() => handleDeleteItem(moderator.moderator_id, "moderator")} aria-label="Видалити модератора"><img src={deleteIcon} alt="Видалити" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {hasMoreModerators && (
                                        <div ref={modLoaderRef} className="admin-list-loader">
                                            {moderatorsLoadingFromHook && modOffset > 0 && <div className="admin-spinner"></div>}
                                            {!moderatorsLoadingFromHook && <div className="admin-loader-text">Завантаження більше модераторів...</div>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {selectedTab === "statistics" && (
                        <>
                            {isLoading ? <div className="admin-loading-state">Завантаження даних статистики...</div> : (
                                <>
                                    <div className="admin-stats-grid">
                                        <div className="stats-admin-card">
                                            <h3 className="admin-stats-card-title">Тривалість презентацій</h3>
                                            <div className="admin-chart-container" style={{ height: "240px" }}>
                                                <canvas ref={activityChartRef}></canvas>
                                            </div>
                                        </div>
                                        <div className="stats-admin-card">
                                            <h3 className="admin-stats-card-title">Зростання кількості користувачів</h3>
                                            <div className="admin-chart-container" style={{ height: "240px" }}>
                                                <canvas ref={usersChartRef}></canvas>
                                            </div>
                                        </div>
                                        <div className="stats-admin-card">
                                            <h3 className="admin-stats-card-title">Записані відео</h3>
                                            <div className="admin-chart-container" style={{ height: "240px" }}>
                                                <canvas ref={videosChartRef}></canvas>
                                            </div>
                                        </div>
                                        <div className="stats-admin-card admin-stats-summary-card">
                                            <div className="admin-stats-summary-item">
                                                <div className="admin-stats-summary-icon admin-user-icon">
                                                    <img src={userIcon} alt="Users" width="24" height="24" />
                                                </div>
                                                <div className="admin-stats-summary-content">
                                                    <h4>Загальна кількість користувачів</h4>
                                                    <div className="admin-stats-summary-value">{statsSummary.totalUsers}</div>
                                                </div>
                                            </div>
                                            <div className="admin-stats-summary-item">
                                                <div className="admin-stats-summary-icon admin-presentation-icon">
                                                    <img src={whiteTimeIcon} alt="Time" width="24" height="24" />
                                                </div>
                                                <div className="admin-stats-summary-content">
                                                    <h4>Загальна тривалість презентацій</h4>
                                                    <div className="admin-stats-summary-value">{statsSummary.totalDuration} хв</div>
                                                </div>
                                            </div>
                                            <div className="admin-stats-summary-item">
                                                <div className="admin-stats-summary-icon admin-video-icon">
                                                    <img src={videoIcon} alt="Videos" width="24" height="24" />
                                                </div>
                                                <div className="admin-stats-summary-content">
                                                    <h4>Загальна кількість записів</h4>
                                                    <div className="admin-stats-summary-value">{statsSummary.totalVideos}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="admin-stats-time-selector">
                                        <button className={`admin-time-range-btn ${statsTimeRange === "days" ? "active" : ""}`} onClick={() => setStatsTimeRange("days")}>Дні</button>
                                        <button className={`admin-time-range-btn ${statsTimeRange === "months" ? "active" : ""}`} onClick={() => setStatsTimeRange("months")}>Місяці</button>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {selectedTab !== "statistics" && (
                        <button className="admin-fab" onClick={handleAdd} aria-label="Додати">+</button>
                    )}
                </main>
            </div>

            {selectedUser && <UpdateProfileModal initialProfile={{ first_name: selectedUser.first_name, last_name: selectedUser.last_name, avatar: selectedUser.avatar }} open={showUserEditModal} onClose={() => { setShowUserEditModal(false); setSelectedUser(null); }} onSave={handleUpdateUser} loading={userActionLoading} />}
            {selectedModerator && <UpdateProfileModal initialProfile={{ first_name: selectedModerator.first_name, last_name: selectedModerator.last_name, avatar: selectedModerator.avatar }} open={showModeratorEditModal} onClose={() => { setShowModeratorEditModal(false); setSelectedModerator(null); }} onSave={handleUpdateModerator} loading={modActionLoading} />}
            <ConfirmationModal open={showConfirmModal} onClose={() => { setShowConfirmModal(false); setItemToDelete(null); }} onConfirm={confirmDelete} confirmationTitle="" confirmationDescription={itemToDelete ? `Ви впевнені, що хочете видалити ${itemToDelete.type === "user" ? "користувача" : "модератора"} ${itemToDelete.firstName} ${itemToDelete.lastName}?` : ""} />

            <AdminInvite
                key={`user-invite-${userInviteKey}`}
                open={showUserInviteModal}
                onClose={() => setShowUserInviteModal(false)}
                onSend={handleSendUserInvite}
                type="user"
                loading={inviteLoading}
            />

            <AdminInvite
                key={`moderator-invite-${moderatorInviteKey}`}
                open={showModeratorInviteModal}
                onClose={() => setShowModeratorInviteModal(false)}
                onSend={handleSendModeratorInvite}
                type="moderator"
                loading={inviteLoading}
            />

            <ErrorModal
                show={showErrorModal || hasError}
                onClose={clearAllErrors}
                message={getErrorMessage()}
            />
        </div>
    );
};

function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, '.');
}

export default AdminDashboardPage;