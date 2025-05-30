import React, { useState, useMemo, useEffect, useRef } from "react";
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

    // Стани для модальних вікон редагування профілю
    const [showUserEditModal, setShowUserEditModal] = useState(false);
    const [showModeratorEditModal, setShowModeratorEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedModerator, setSelectedModerator] = useState<any>(null);

    // Chart refs
    const activityChartRef = useRef<HTMLCanvasElement>(null);
    const usersChartRef = useRef<HTMLCanvasElement>(null);
    const videosChartRef = useRef<HTMLCanvasElement>(null);
    const activityChartInstance = useRef<Chart | null>(null);
    const usersChartInstance = useRef<Chart | null>(null);
    const videosChartInstance = useRef<Chart | null>(null);

    const navigate = useNavigate();
    const { logout } = useAuth();
    const { profile: currentAdmin } = useProfile();

    // Параметри запиту для отримання користувачів
    const userQueryParams = useMemo(() => ({
        search: search || undefined,
        sort: userSort,
        order: userOrder,
        limit: 50,
        offset: 0
    }), [search, userSort, userOrder]);

    // Параметри запиту для отримання модераторів
    const modQueryParams = useMemo(() => ({
        search: search || undefined,
        sort: modSort,
        order: modOrder,
        limit: 50,
        offset: 0
    }), [search, modSort, modOrder]);

    // Параметри запиту для статистики
    const statsParams = useMemo(() => ({
        limit: 30,
        offset: 0,
    }), []);

    // Використовуємо хуки для отримання даних
    const {
        users,
        loading: usersLoading,
        error: usersError,
        refetch: refetchUsers
    } = useAdminUsers(userQueryParams);

    const {
        moderators,
        loading: moderatorsLoading,
        error: moderatorsError,
        refetch: refetchModerators
    } = useAdminModerators(modQueryParams);

    const {
        dailyStats,
        loading: dailyStatsLoading,
        error: dailyStatsError,
    } = useAdminDailyStats(statsParams);

    const {
        monthlyStats,
        loading: monthlyStatsLoading,
        error: monthlyStatsError,
    } = useAdminMonthlyStats(statsParams);

    // Використовуємо хуки для дій
    const {
        deleteUser,
        updateUserProfile,
        error: userActionError,
        loading: userActionLoading
    } = useAdminUserActions();

    const {
        deleteModerator,
        updateModeratorProfile,
        error: modActionError,
        loading: modActionLoading
    } = useAdminModeratorActions();

    const handleLogout = () => {
        logout("admin");
        navigate("/admin/login");
    };

    const handleEditUser = (userId: number) => {
        const user = users.find(u => u.user_id === userId);
        if (user) {
            setSelectedUser(user);
            setShowUserEditModal(true);
        }
    };

    const handleEditModerator = (moderatorId: number) => {
        const moderator = moderators.find(m => m.moderator_id === moderatorId);
        if (moderator) {
            setSelectedModerator(moderator);
            setShowModeratorEditModal(true);
        }
    };

    const handleUpdateUser = async (fields: { first_name: string; last_name: string; avatar?: File | null }) => {
        if (selectedUser) {
            try {
                await updateUserProfile(selectedUser.user_id, fields);
                refetchUsers();
                setShowUserEditModal(false);
            } catch (error) {
                console.error("Помилка оновлення профілю:", error);
                setShowErrorModal(true);
            }
        }
    };

    const handleUpdateModerator = async (fields: { first_name: string; last_name: string; avatar?: File | null }) => {
        if (selectedModerator) {
            try {
                await updateModeratorProfile(selectedModerator.moderator_id, fields);
                refetchModerators();
                setShowModeratorEditModal(false);
            } catch (error) {
                console.error("Помилка оновлення профілю:", error);
                setShowErrorModal(true);
            }
        }
    };

    const handleDeleteItem = (id: number, type: "user" | "moderator") => {
        if (type === "user") {
            const user = users.find(u => u.user_id === id);
            if (user) {
                setItemToDelete({
                    id,
                    type,
                    firstName: user.first_name,
                    lastName: user.last_name
                });
            }
        } else {
            const moderator = moderators.find(m => m.moderator_id === id);
            if (moderator) {
                setItemToDelete({
                    id,
                    type,
                    firstName: moderator.first_name,
                    lastName: moderator.last_name
                });
            }
        }
        setShowConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        let success = false;
        if (itemToDelete.type === "user") {
            success = await deleteUser(itemToDelete.id);
            if (success) refetchUsers();
        } else {
            success = await deleteModerator(itemToDelete.id);
            if (success) refetchModerators();
        }

        setShowConfirmModal(false);
        setItemToDelete(null);
    };

    const handleAddUser = () => {
        navigate("/admin/user/add");
    };

    const handleAddModerator = () => {
        navigate("/admin/moderator/add");
    };

    const handleAdd = () => {
        if (selectedTab === "users") {
            handleAddUser();
        } else if (selectedTab === "moderators") {
            handleAddModerator();
        }
    };

    const setSortByUserRegisteredAt = () => {
        if (userSort === "registeredAt") {
            setUserOrder(userOrder === "desc" ? "asc" : "desc");
        } else {
            setUserSort("registeredAt");
            setUserOrder("desc");
        }
    };

    const setSortByUserName = () => {
        if (userSort === "name") {
            setUserOrder(userOrder === "asc" ? "desc" : "asc");
        } else {
            setUserSort("name");
            setUserOrder("asc");
        }
    };

    const setSortByModJoinedAt = () => {
        if (modSort === "joinedAt") {
            setModOrder(modOrder === "desc" ? "asc" : "desc");
        } else {
            setModSort("joinedAt");
            setModOrder("desc");
        }
    };

    const setSortByModName = () => {
        if (modSort === "name") {
            setModOrder(modOrder === "asc" ? "desc" : "asc");
        } else {
            setModSort("name");
            setModOrder("asc");
        }
    };

    const getErrorMessage = () => {
        return usersError || moderatorsError || userActionError || modActionError || dailyStatsError || monthlyStatsError || "";
    };

    const isLoading = selectedTab === "users" ? usersLoading : (selectedTab === "moderators" ? moderatorsLoading : (dailyStatsLoading || monthlyStatsLoading));
    const hasError = !!(usersError || moderatorsError || userActionError || modActionError || dailyStatsError || monthlyStatsError);

    // Ініціалізація та оновлення графіків
    useEffect(() => {
        if (selectedTab !== "statistics") return;

        // Функція для відображення графіків
        const renderCharts = () => {
            // Підготовка даних для графіків
            let labels: string[] = [];
            let activityData: number[] = [];
            let usersData: number[] = [];
            let videosData: number[] = [];

            switch (statsTimeRange) {
                case "days":
                    if (dailyStats?.length) {
                        // Сортування даних за датою (від старих до нових) для графіка зліва направо
                        const sortedDailyStats = [...dailyStats].sort((a, b) =>
                            new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
                        );

                        const last30Days = sortedDailyStats.slice(-30);
                        labels = last30Days.map(stat => formatShortDate(stat.period_start));
                        activityData = last30Days.map(stat => Math.round(stat.total_presentation_duration_seconds / 60)); // Конвертуємо секунди в хвилини
                        usersData = last30Days.map(stat => stat.total_users_count);
                        videosData = last30Days.map(stat => stat.videos_recorded_count);
                    }
                    break;
                case "months":
                    if (monthlyStats?.length) {
                        // Сортування даних за датою (від старих до нових) для графіка зліва направо
                        const sortedMonthlyStats = [...monthlyStats].sort((a, b) =>
                            new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
                        );

                        labels = sortedMonthlyStats.map(stat => {
                            const date = new Date(stat.period_start);
                            return date.toLocaleDateString('uk-UA', { month: 'short' });
                        });
                        activityData = sortedMonthlyStats.map(stat => Math.round(stat.total_presentation_duration_seconds / 60));
                        usersData = sortedMonthlyStats.map(stat => stat.total_users_count);
                        videosData = sortedMonthlyStats.map(stat => stat.videos_recorded_count);
                    }
                    break;
            }

            // Ініціалізація графіків
            initActivityChart(labels, activityData);
            initUsersChart(labels, usersData);
            initVideosChart(labels, videosData);
        };

        renderCharts();

        // Очищення при розмонтуванні
        return () => {
            if (activityChartInstance.current) {
                activityChartInstance.current.destroy();
            }
            if (usersChartInstance.current) {
                usersChartInstance.current.destroy();
            }
            if (videosChartInstance.current) {
                videosChartInstance.current.destroy();
            }
        };
    }, [selectedTab, statsTimeRange, dailyStats, monthlyStats]);

    const initActivityChart = (labels: string[], data: number[]) => {
        if (!activityChartRef.current) return;

        if (activityChartInstance.current) {
            activityChartInstance.current.destroy();
        }

        const ctx = activityChartRef.current.getContext('2d');
        if (!ctx) return;

        activityChartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Загальна тривалість (хвилини)',
                    data: data,
                    backgroundColor: '#5a7460',
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            boxWidth: 12,
                            usePointStyle: true
                        }
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    };

    const initUsersChart = (labels: string[], data: number[]) => {
        if (!usersChartRef.current) return;

        if (usersChartInstance.current) {
            usersChartInstance.current.destroy();
        }

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
                    backgroundColor: '#4baaa8',
                    borderColor: '#4baaa8',
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#4baaa8'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            boxWidth: 12,
                            usePointStyle: true
                        }
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    };

    const initVideosChart = (labels: string[], data: number[]) => {
        if (!videosChartRef.current) return;

        if (videosChartInstance.current) {
            videosChartInstance.current.destroy();
        }

        const ctx = videosChartRef.current.getContext('2d');
        if (!ctx) return;

        videosChartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Нові записи',
                    data: data,
                    backgroundColor: 'rgba(255, 159, 64, 0)',
                    borderColor: '#f8a055',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#f8a055'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            boxWidth: 12,
                            usePointStyle: true
                        }
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    };

    // Функція для отримання загальних підсумкових даних
    const getStatsSummary = () => {
        if (!monthlyStats?.length) {
            return {
                totalUsers: 10,
                totalDuration: 1000,
                totalVideos: 200
            };
        }

        const lastMonth = monthlyStats[monthlyStats.length - 1];

        return {
            totalUsers: lastMonth.total_users_count || 10,
            totalDuration: Math.round(lastMonth.total_presentation_duration_seconds / 60) || 1000, // Конвертуємо в хвилини
            totalVideos: lastMonth.videos_recorded_count || 200
        };
    };

    const statsSummary = getStatsSummary();

    // Допоміжна функція для скороченого формату дати (для графіків)
    const formatShortDate = (dateStr?: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="admin-dashboard-container">
            <div className="admin-sidebar">
                <Logo role={Role.Admin} />

                <nav className="admin-nav">
                    <div
                        className={`nav-item ${selectedTab === "users" ? "active" : ""}`}
                        onClick={() => setSelectedTab("users")}
                    >
                        Користувачі
                    </div>
                    <div
                        className={`nav-item ${selectedTab === "moderators" ? "active" : ""}`}
                        onClick={() => setSelectedTab("moderators")}
                    >
                        Модератори
                    </div>
                    <div
                        className={`nav-item ${selectedTab === "statistics" ? "active" : ""}`}
                        onClick={() => setSelectedTab("statistics")}
                    >
                        Статистики
                    </div>
                </nav>
            </div>

            <div className="admin-content">
                <div className="admin-header">
                    <h1 className="admin-title">{selectedTab === "users" ? "Користувачі" : selectedTab === "moderators" ? "Модератори" : "Статистики"}</h1>
                    <div className="admin-logout" onClick={handleLogout}>
                        <img src={logoutIcon} alt="Вихід" className="logout-icon" />
                    </div>
                </div>

                {selectedTab !== "statistics" && (
                    <div className="admin-search-bar">
                        <div className="search-container">
                            <img src={searchIcon} alt="Пошук" className="search-icon"/>
                            <input
                                type="text"
                                placeholder={selectedTab === "users" ? "Пошук користувачів..." : "Пошук модераторів..."}
                                className="search-input"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="tabs-container">
                            {selectedTab === "users" ? (
                                <>
                                    <span
                                        className={`tab ${userSort === "registeredAt" ? "active" : ""}`}
                                        onClick={setSortByUserRegisteredAt}
                                    >
                                        Останні зареєстровані {userSort === "registeredAt" && (userOrder === "desc" ? "↓" : "↑")}
                                    </span>
                                    <span
                                        className={`tab ${userSort === "name" ? "active" : ""}`}
                                        onClick={setSortByUserName}
                                    >
                                        За алфавітом {userSort === "name" && (userOrder === "asc" ? "↓" : "↑")}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span
                                        className={`tab ${modSort === "joinedAt" ? "active" : ""}`}
                                        onClick={setSortByModJoinedAt}
                                    >
                                        Останні зареєстровані {modSort === "joinedAt" && (modOrder === "desc" ? "↓" : "↑")}
                                    </span>
                                    <span
                                        className={`tab ${modSort === "name" ? "active" : ""}`}
                                        onClick={setSortByModName}
                                    >
                                        За алфавітом {modSort === "name" && (modOrder === "asc" ? "↓" : "↑")}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {selectedTab === "users" && (
                    <div className="users-list-container">
                        {usersLoading ? (
                            <div className="loading-indicator">Завантаження...</div>
                        ) : users.length === 0 ? (
                            <div className="no-users">Користувачів не знайдено</div>
                        ) : (
                            <div className="users-list">
                                {users.map(user => (
                                    <div key={user.user_id} className="user-item">
                                        <div className="user-avatar-container">
                                            <Avatar
                                                src={user.avatar ? import.meta.env.VITE_APP_API_BASE_URL + user.avatar : null}
                                                alt={user.first_name}
                                                size={48}
                                            />
                                        </div>
                                        <div className="user-info">
                                            <div className="user-name">{user.first_name} {user.last_name}</div>
                                            <div className="user-premium">{user.has_premium ? "Преміум" : "Не преміум"}</div>
                                        </div>
                                        <div className="user-email">
                                            {user.email}
                                        </div>
                                        <div className="user-registration">
                                            <div>Реєстрація:</div>
                                            <div>{formatDate(user.registered_at)}</div>
                                        </div>
                                        <div className="user-actions">
                                            <button className="action-btn edit-btn" onClick={() => handleEditUser(user.user_id)}>
                                                <img src={editIcon} alt="Редагувати" />
                                            </button>
                                            <button className="action-btn delete-btn" onClick={() => handleDeleteItem(user.user_id, "user")}>
                                                <img src={deleteIcon} alt="Видалити" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {selectedTab === "moderators" && (
                    <div className="users-list-container">
                        {moderatorsLoading ? (
                            <div className="loading-indicator">Завантаження...</div>
                        ) : moderators.length === 0 ? (
                            <div className="no-users">Модераторів не знайдено</div>
                        ) : (
                            <div className="users-list">
                                {moderators.map(moderator => (
                                    <div key={moderator.moderator_id} className="user-item">
                                        <div className="user-avatar-container">
                                            <Avatar
                                                src={moderator.avatar ? import.meta.env.VITE_APP_API_BASE_URL + moderator.avatar : null}
                                                alt={moderator.first_name}
                                                size={48}
                                            />
                                        </div>
                                        <div className="user-info">
                                            <div className="user-name">{moderator.first_name} {moderator.last_name}</div>
                                            <div className="user-role">Модератор</div>
                                        </div>
                                        <div className="user-email">
                                            {moderator.email}
                                        </div>
                                        <div className="user-registration">
                                            <div>Приєднався:</div>
                                            <div>{formatDate(moderator.joined_at)}</div>
                                        </div>
                                        <div className="user-actions">
                                            <button className="action-btn edit-btn" onClick={() => handleEditModerator(moderator.moderator_id)}>
                                                <img src={editIcon} alt="Редагувати" />
                                            </button>
                                            <button className="action-btn delete-btn" onClick={() => handleDeleteItem(moderator.moderator_id, "moderator")}>
                                                <img src={deleteIcon} alt="Видалити" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {selectedTab === "statistics" && (
                    <>
                        {isLoading ? (
                            <div className="loading-indicator">Завантаження даних статистики...</div>
                        ) : (
                            <>
                                <div className="stats-grid">
                                    <div className="stats-card">
                                        <h3 className="stats-card-title">Тривалість презентацій</h3>
                                        <div className="chart-container">
                                            <canvas ref={activityChartRef}></canvas>
                                        </div>
                                    </div>

                                    <div className="stats-card">
                                        <h3 className="stats-card-title">Зростання кількості користувачів</h3>
                                        <div className="chart-container">
                                            <canvas ref={usersChartRef}></canvas>
                                        </div>
                                    </div>

                                    <div className="stats-card">
                                        <h3 className="stats-card-title">Записані відео</h3>
                                        <div className="chart-container">
                                            <canvas ref={videosChartRef}></canvas>
                                        </div>
                                    </div>

                                    <div className="stats-card stats-summary-card">
                                        <div className="stats-summary-item">
                                            <div className="stats-summary-icon user-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="24" height="24">
                                                    <path d="M12,12c2.21,0 4,-1.79 4,-4s-1.79,-4 -4,-4 -4,1.79 -4,4 1.79,4 4,4zM12,14c-2.67,0 -8,1.34 -8,4v2h16v-2c0,-2.66 -5.33,-4 -8,-4z"/>
                                                </svg>
                                            </div>
                                            <div className="stats-summary-content">
                                                <h4>Загальна кількість користувачів</h4>
                                                <div className="stats-summary-value">{statsSummary.totalUsers}</div>
                                            </div>
                                        </div>

                                        <div className="stats-summary-item">
                                            <div className="stats-summary-icon presentation-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="24" height="24">
                                                    <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M9,17H7V10H9V17M13,17H11V7H13V17M17,17H15V13H17V17Z"/>
                                                </svg>
                                            </div>
                                            <div className="stats-summary-content">
                                                <h4>Загальна тривалість презентацій</h4>
                                                <div className="stats-summary-value">{statsSummary.totalDuration} хв</div>
                                            </div>
                                        </div>

                                        <div className="stats-summary-item">
                                            <div className="stats-summary-icon video-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="24" height="24">
                                                    <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
                                                </svg>
                                            </div>
                                            <div className="stats-summary-content">
                                                <h4>Загальна кількість записів</h4>
                                                <div className="stats-summary-value">{statsSummary.totalVideos}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="stats-time-selector">
                                    <button
                                        className={`time-range-btn ${statsTimeRange === "days" ? "active" : ""}`}
                                        onClick={() => setStatsTimeRange("days")}
                                    >
                                        Дні
                                    </button>
                                    <button
                                        className={`time-range-btn ${statsTimeRange === "months" ? "active" : ""}`}
                                        onClick={() => setStatsTimeRange("months")}
                                    >
                                        Місяці
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}

                {selectedTab !== "statistics" && (
                    <button className="fab-button" onClick={handleAdd}>
                        +
                    </button>
                )}
            </div>

            {/* Модальне вікно редагування профілю користувача */}
            {selectedUser && (
                <UpdateProfileModal
                    initialProfile={{
                        first_name: selectedUser.first_name,
                        last_name: selectedUser.last_name,
                        avatar: selectedUser.avatar
                    }}
                    open={showUserEditModal}
                    onClose={() => {
                        setShowUserEditModal(false);
                        setSelectedUser(null);
                    }}
                    onSave={handleUpdateUser}
                    loading={userActionLoading}
                />
            )}

            {/* Модальне вікно редагування профілю модератора */}
            {selectedModerator && (
                <UpdateProfileModal
                    initialProfile={{
                        first_name: selectedModerator.first_name,
                        last_name: selectedModerator.last_name,
                        avatar: selectedModerator.avatar
                    }}
                    open={showModeratorEditModal}
                    onClose={() => {
                        setShowModeratorEditModal(false);
                        setSelectedModerator(null);
                    }}
                    onSave={handleUpdateModerator}
                    loading={modActionLoading}
                />
            )}

            <ErrorModal
                show={showErrorModal || hasError}
                onClose={() => setShowErrorModal(false)}
                message={getErrorMessage()}
            />

            <ConfirmationModal
                open={showConfirmModal}
                onClose={() => {
                    setShowConfirmModal(false);
                    setItemToDelete(null);
                }}
                onConfirm={confirmDelete}
                confirmationTitle=""
                confirmationDescription={itemToDelete ?
                    `Ви впевнені, що хочете видалити ${itemToDelete.type === "user" ? "користувача" : "модератора"} ${itemToDelete.firstName} ${itemToDelete.lastName}?` :
                    ""}
            />
        </div>
    );
};

function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).replace(/\//g, '.');
}

export default AdminDashboardPage;