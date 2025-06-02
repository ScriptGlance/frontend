import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import illustration from "../../assets/dashboard-illustration.png";
import filterIcon from "../../assets/filter.svg";
import searchIcon from "../../assets/search.svg";
import statsDocsIcon from "../../assets/stats-docs.svg";
import presentationIcon from "../../assets/presentation-icon.svg";
import statsUsersIcon from "../../assets/stats-users.svg";
import statsVideoIcon from "../../assets/stats-video.svg";
import {BeigeButton, GrayButton,} from "../../components/appButton/AppButton";
import ErrorModal from "../../components/modals/error/ErrorModal.tsx";
import "./UserDashboardPage.css";
import {useDashboardData} from "../../hooks/useDashboardData.ts";
import {Avatar} from "../../components/avatar/Avatar.tsx";
import {pluralizeUkrainian} from "../../utils/plurals.ts";
import RightHeaderButtons from "../../components/rightHeaderButtons/RightHeaderButtons.tsx";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../hooks/useAuth.ts";
import {useProfile} from "../../hooks/ProfileContext.tsx";
import {Presentation} from "../../api/repositories/presentationsRepository.ts";
import {usePresentationGlobalActions} from "../../hooks/usePresentationActions.ts";
import Logo from "../../components/logo/Logo.tsx";
import {Role} from "../../types/role.ts";
import {UserProfile} from "../../api/repositories/profileRepository.ts";


export const UserDashboardPage = () => {
    const [selectedType, setSelectedType] = useState<"all" | "individual" | "group">("all");
    const [selectedDate, setSelectedDate] = useState<"allTime" | "today" | "lastWeek" | "lastMonth" | "lastYear">("allTime");
    const [selectedOwner, setSelectedOwner] = useState<"all" | "me" | "others">("all");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<"byUpdatedAt" | "byName" | "byCreatedAt" | "byParticipantsCount">("byUpdatedAt");
    const [showErrorModal, setShowErrorModal] = useState(false);

    const [presentations, setPresentations] = useState<Presentation[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 20;

    const {logout} = useAuth();

    const navigate = useNavigate();

    const {
        createPresentation, createError
    } = usePresentationGlobalActions();


    const handleLogout = () => {
        logout("user");
        navigate("/login");
    };

    const handlePresentationClick = (presentationId: number) => {
        navigate(`/presentation/${presentationId}`);
    };

    const handleCreatePresentation = async () => {
        const created = await createPresentation();
        handlePresentationClick(created.presentation_id);
        if (createError) {
            setShowErrorModal(true);
        }
    };

    const {profile: currentUser, loading: profileLoading, error: profileError} = useProfile(Role.User);

    const queryParams = useMemo(() => ({
        type: selectedType,
        lastChange: selectedDate,
        owner: selectedOwner,
        search,
        sort,
        limit: LIMIT,
        offset,
    }), [selectedType, selectedDate, selectedOwner, search, sort, offset]);

    const {stats, presentations: fetchedPresentations, loading, error} = useDashboardData(queryParams);

    useEffect(() => {
        setOffset(0);
        setHasMore(true);
        setIsInitialLoading(true);
        setPresentations([]);
    }, [selectedType, selectedDate, selectedOwner, sort, search]);

    useEffect(() => {
        if (offset === 0) {
            setPresentations(fetchedPresentations);
            setIsInitialLoading(false);
        } else if (fetchedPresentations.length > 0) {
            setPresentations(prev => {
                const ids = new Set(prev.map(item => item.presentation_id));
                return [...prev, ...fetchedPresentations.filter(item => !ids.has(item.presentation_id))];
            });
        }
        setHasMore(fetchedPresentations.length === LIMIT);
    }, [fetchedPresentations, offset]);

    const presentationsListRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (presentationsListRef.current) {
            presentationsListRef.current.scrollTop = 0;
        }
    }, [sort, search, selectedType, selectedDate, selectedOwner]);

    const isFetching = useRef(false);

    const handleScroll = useCallback(() => {
        if (loading || !hasMore || isFetching.current || !presentationsListRef.current) return;

        const {scrollTop, scrollHeight, clientHeight} = presentationsListRef.current;

        if (scrollTop + clientHeight >= scrollHeight - 100) {
            isFetching.current = true;
            setOffset(prev => prev + LIMIT);
            setTimeout(() => {
                isFetching.current = false;
            }, 400);
        }
    }, [loading, hasMore]);

    useEffect(() => {
        const listElement = presentationsListRef.current;
        if (listElement) {
            listElement.addEventListener("scroll", handleScroll);
            return () => listElement.removeEventListener("scroll", handleScroll);
        }
    }, [handleScroll]);

    const handleResetFilters = () => {
        setSelectedType("all");
        setSelectedDate("allTime");
        setSelectedOwner("all");
    };

    useEffect(() => {
        if (error || profileError) setShowErrorModal(true);
    }, [error, profileError]);

    useEffect(() => {
        if (!currentUser) return;
        setPresentations(prev =>
            prev.map(p =>
                p.owner.user_id === (currentUser as UserProfile | undefined)?.user_id
                    ? {...p, owner: {...p.owner, ...currentUser}}
                    : p
            )
        );
    }, [currentUser]);

    return (
        <div className="dashboard-layout">
            <header className="dashboard-header">
                <div className="welcome-section">
                    <Logo premium={(currentUser as UserProfile | undefined)?.has_premium} />
                    <h1 className="welcome-title">
                        {profileLoading ? "Завантаження..." : `Вітаю, ${currentUser?.first_name || "Користувач"}!`}
                    </h1>
                    <p className="welcome-subtitle">Керуйте своїми виступами.</p>
                    <div className="welcome-button-container">
                        <BeigeButton label="Створити виступ" className="create-btn" onClick={handleCreatePresentation}/>
                    </div>
                </div>
                <div className="illustration-section">
                    <img src={illustration} alt="Ілюстрація" className="dashboard-illustration"/>
                </div>
                <div className="header-right">
                    <RightHeaderButtons
                        onChat={() => {}}
                        onLogout={handleLogout}
                    />
                    <div className="stats-cards">
                        <div className="stats-card">
                            <div className="stats-icon-wrapper" style={{background: '#D3DDD7'}}>
                                <img src={statsDocsIcon} alt="Виступи" className="stats-icon"/>
                            </div>
                            <div className="stats-text">
                                <div className="stats-label">Всього виступів</div>
                                <div className="stats-value">
                                    {typeof stats?.presentation_count === 'number' ? stats.presentation_count : "10"}
                                </div>
                            </div>
                        </div>
                        <div className="stats-card">
                            <div className="stats-icon-wrapper" style={{background: '#E3E4EA'}}>
                                <img src={statsUsersIcon} alt="Учасники" className="stats-icon"/>
                            </div>
                            <div className="stats-text">
                                <div className="stats-label">Запрошено учасників</div>
                                <div className="stats-value">
                                    {typeof stats?.invited_participants === 'number' ? stats.invited_participants : "4"}
                                </div>
                            </div>
                        </div>
                        <div className="stats-card">
                            <div className="stats-icon-wrapper" style={{background: '#F1E8D6'}}>
                                <img src={statsVideoIcon} alt="Записи" className="stats-icon"/>
                            </div>
                            <div className="stats-text">
                                <div className="stats-label">Зроблено записів</div>
                                <div className="stats-value">
                                    {typeof stats?.recordings_made === 'number' ? stats.recordings_made : "6"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="main-content">
                    <section className="filters-section">
                        <div className="filters-header">
                            <div className="stats-icon-wrapper" style={{background: '#E3E4EA'}}>
                                <img src={filterIcon} alt="Фільтр" className="filter-icon"/>
                            </div>
                            <div className="filters-title">Фільтри виступів</div>
                        </div>
                        <div className="filter-section">
                            <div className="filter-label">Тип виступу</div>
                            <div className="filter-options">
                                <label>
                                    <input
                                        type="radio"
                                        name="presentationType"
                                        checked={selectedType === "individual"}
                                        onChange={() => setSelectedType("individual")}
                                    />
                                    <span>Індивідуальний</span>
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="presentationType"
                                        checked={selectedType === "group"}
                                        onChange={() => setSelectedType("group")}
                                    />
                                    <span>Спільний</span>
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="presentationType"
                                        checked={selectedType === "all"}
                                        onChange={() => setSelectedType("all")}
                                    />
                                    <span>Всі</span>
                                </label>
                            </div>
                        </div>
                        <div className="filter-section">
                            <div className="filter-label">Остання зміна виступу</div>
                            <div className="filter-options">
                                <label>
                                    <input
                                        type="radio"
                                        name="lastChange"
                                        checked={selectedDate === "today"}
                                        onChange={() => setSelectedDate("today")}
                                    />
                                    <span>Сьогодні</span>
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="lastChange"
                                        checked={selectedDate === "lastWeek"}
                                        onChange={() => setSelectedDate("lastWeek")}
                                    />
                                    <span>За останній тиждень</span>
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="lastChange"
                                        checked={selectedDate === "lastMonth"}
                                        onChange={() => setSelectedDate("lastMonth")}
                                    />
                                    <span>За останній місяць</span>
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="lastChange"
                                        checked={selectedDate === "lastYear"}
                                        onChange={() => setSelectedDate("lastYear")}
                                    />
                                    <span>За останній рік</span>
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="lastChange"
                                        checked={selectedDate === "allTime"}
                                        onChange={() => setSelectedDate("allTime")}
                                    />
                                    <span>За весь час</span>
                                </label>
                            </div>
                        </div>
                        <div className="filter-section">
                            <div className="filter-label">Власник виступу</div>
                            <div className="filter-options">
                                <label>
                                    <input
                                        type="radio"
                                        name="owner"
                                        checked={selectedOwner === "me"}
                                        onChange={() => setSelectedOwner("me")}
                                    />
                                    <span>Я</span>
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="owner"
                                        checked={selectedOwner === "others"}
                                        onChange={() => setSelectedOwner("others")}
                                    />
                                    <span>Інші</span>
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="owner"
                                        checked={selectedOwner === "all"}
                                        onChange={() => setSelectedOwner("all")}
                                    />
                                    <span>Всі</span>
                                </label>
                            </div>
                        </div>
                        <div className="reset-filters-btn-container">
                            <GrayButton
                                label="Скинути фільтри"
                                className="reset-filters-btn"
                                onClick={handleResetFilters}
                            />
                        </div>
                    </section>

                    <section className="presentations-section">
                        <div className="presentations-search">
                            <div className="search-container">
                                <img src={searchIcon} alt="Пошук" className="search-icon"/>
                                <input
                                    type="text"
                                    placeholder="Пошук виступів"
                                    className="search-input"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="tabs-container">
                                <span
                                    className={`tab ${sort === "byUpdatedAt" ? "active" : ""}`}
                                    onClick={() => setSort("byUpdatedAt")}
                                >
                                    Останні
                                </span>
                                <span
                                    className={`tab ${sort === "byName" ? "active" : ""}`}
                                    onClick={() => setSort("byName")}
                                >
                                    За алфавітом
                                </span>
                                <span
                                    className={`tab ${sort === "byCreatedAt" ? "active" : ""}`}
                                    onClick={() => setSort("byCreatedAt")}
                                >
                                    Найновіші
                                </span>
                                <span
                                    className={`tab ${sort === "byParticipantsCount" ? "active" : ""}`}
                                    onClick={() => setSort("byParticipantsCount")}
                                >
                                    За учасниками
                                </span>
                            </div>
                        </div>

                        <div className="presentations-list" ref={presentationsListRef}>
                            {isInitialLoading || loading && presentations.length === 0 ? (
                                <div className="loading-indicator">Завантаження...</div>
                            ) : presentations.length === 0 && !loading ? (
                                <div className="presentations-not-found">Виступів не знайдено</div>
                            ) : (
                                presentations.map(presentation => (
                                    <div key={presentation.presentation_id} className="presentation-item"
                                         onClick={() => handlePresentationClick(presentation.presentation_id)}>
                                        <div className="presentation-icon-circle">
                                            <img src={presentationIcon} alt="Документ"/>
                                        </div>
                                        <div className="presentation-info">
                                            <div className="presentation-title">
                                                {presentation.name || "Виступ без назви"}
                                            </div>
                                            <div className="presentation-type">
                                                {presentation.participant_count > 1
                                                    ? `Спільний виступ · ${presentation.participant_count} ${pluralizeUkrainian(presentation.participant_count, ['учасник', 'учасники', 'учасників'])}`
                                                    : "Індивідуальний виступ"}
                                            </div>
                                        </div>
                                        <div className="presentation-date">
                                            <div>
                                                <div className="date-label">Остання зміна:</div>
                                                <div className="date-value">{formatDate(presentation.modified_at)}</div>
                                            </div>
                                        </div>
                                        <div className="presentation-owner">
                                            <span className="owner-name">
                                                {presentation.owner.first_name}<br/>{presentation.owner.last_name}
                                            </span>
                                            <Avatar
                                                src={presentation.owner.avatar ? import.meta.env.VITE_APP_API_BASE_URL + presentation.owner.avatar : null}
                                                alt={presentation.owner.first_name}
                                                size={36}
                                                name={presentation.owner.first_name}
                                                surname={presentation.owner.last_name}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                            {!isInitialLoading && loading && presentations.length > 0 && (
                                <div className="loading-indicator">Завантаження...</div>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <ErrorModal
                show={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                message={error || profileError || ""}
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

export default UserDashboardPage;