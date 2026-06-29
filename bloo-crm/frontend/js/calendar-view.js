/* =====================================================
   CALENDAR VIEW JAVASCRIPT - WITH BACKEND INTEGRATION
   ===================================================== */

class CalendarView {
    constructor(userId = 'default-user') {
        this.userId = userId;
        this.currentDate = new Date();
        this.miniCalendarDate = new Date();
        this.events = new Map();
        this.connections = [];
        this.selectedCalendars = new Set();
        this.currentView = 'month';
        this.settings = {
            showWeekends: true,
            show24HourTime: false,
            weekStartDay: 0,
            defaultEventDuration: 60
        };

        this.apiBase = 'http://localhost:5000/api';
        this.initializeEventListeners();
        this.loadConnections();
        this.loadSettings();
        this.loadAllEvents();
        this.renderCalendar();
        this.renderMiniCalendar();
        this.loadUpcomingEvents();
    }

    initializeEventListeners() {
        // Month navigation
        document.getElementById('btnPrevMonth')?.addEventListener('click', () => this.previousMonth());
        document.getElementById('btnNextMonth')?.addEventListener('click', () => this.nextMonth());
        document.getElementById('btnToday')?.addEventListener('click', () => this.goToToday());

        // Mini calendar
        document.getElementById('miniPrev')?.addEventListener('click', () => this.previousMiniMonth());
        document.getElementById('miniNext')?.addEventListener('click', () => this.nextMiniMonth());

        // Event modals
        document.getElementById('btnNewEvent')?.addEventListener('click', () => this.openEventModal());
        document.getElementById('btnSaveEvent')?.addEventListener('click', () => this.saveEvent());
        document.getElementById('btnCancelEvent')?.addEventListener('click', () => this.closeEventModal());
        document.getElementById('btnCloseEvent')?.addEventListener('click', () => this.closeEventModal());

        // Event detail modal
        document.getElementById('btnCloseEventDetail')?.addEventListener('click', () => this.closeEventDetailModal());
        document.getElementById('btnEditEvent')?.addEventListener('click', () => this.editEventFromDetail());
        document.getElementById('btnDeleteEvent')?.addEventListener('click', () => this.deleteEventFromDetail());

        // Settings
        document.getElementById('btnCalendarSettings')?.addEventListener('click', () => this.openSettingsModal());
        document.getElementById('btnCloseCalendarSettings')?.addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('btnSyncCalendar')?.addEventListener('click', () => this.openSyncModal());
        document.getElementById('btnAddCalendar')?.addEventListener('click', () => this.addCalendarAccount());

        // Event form
        document.getElementById('eventAllDay')?.addEventListener('change', (e) => {
            const startTime = document.getElementById('eventStartTime');
            const endTime = document.getElementById('eventEndTime');
            if (startTime) startTime.disabled = e.target.checked;
            if (endTime) endTime.disabled = e.target.checked;
        });

        document.getElementById('eventRecurrence')?.addEventListener('change', (e) => {
            const group = document.getElementById('recurrenceEndGroup');
            if (group) group.style.display = e.target.value !== 'none' ? 'block' : 'none';
        });

        // Settings tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Search
        document.getElementById('eventSearch')?.addEventListener('input', (e) => this.searchEvents(e.target.value));

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });

        // Sync modal
        document.getElementById('btnStartSync')?.addEventListener('click', () => this.startSync());
        document.getElementById('btnCloseSyncBtn')?.addEventListener('click', () => this.closeSyncModal());
        document.getElementById('btnCloseSyncModal')?.addEventListener('click', () => this.closeSyncModal());

        // Settings checkboxes
        document.getElementById('showWeekends')?.addEventListener('change', (e) => {
            this.settings.showWeekends = e.target.checked;
            this.saveSettings();
            this.renderCalendar();
        });

        document.getElementById('show24HourTime')?.addEventListener('change', (e) => {
            this.settings.show24HourTime = e.target.checked;
            this.saveSettings();
            this.renderCalendar();
        });

        document.getElementById('weekStartDay')?.addEventListener('change', (e) => {
            this.settings.weekStartDay = parseInt(e.target.value);
            this.saveSettings();
            this.renderCalendar();
        });

        document.getElementById('defaultEventDuration')?.addEventListener('change', (e) => {
            this.settings.defaultEventDuration = parseInt(e.target.value);
            this.saveSettings();
        });
    }

    // =====================================================
    // BACKEND API METHODS
    // =====================================================

    async loadAllEvents() {
        try {
            const response = await fetch(
                `${this.apiBase}/calendar/events?userId=${this.userId}`
            );
            const data = await response.json();
            if (data.status === 'success') {
                this.events.clear();
                data.events.forEach(event => {
                    const eventObj = {
                        id: event._id,
                        ...event,
                        startDate: new Date(event.startDate),
                        endDate: new Date(event.endDate)
                    };
                    this.events.set(event._id, eventObj);
                });
            }
        } catch (error) {
            console.error('Failed to load events from backend:', error);
            this.showToast('Failed to load calendar events', 'error');
        }
    }

    async saveEvent() {
        try {
            const title = document.getElementById('eventTitle')?.value;
            const description = document.getElementById('eventDescription')?.value;
            const startDate = document.getElementById('eventStartDate')?.value;
            const startTime = document.getElementById('eventStartTime')?.value;
            const endDate = document.getElementById('eventEndDate')?.value;
            const endTime = document.getElementById('eventEndTime')?.value;
            const allDay = document.getElementById('eventAllDay')?.checked;
            const location = document.getElementById('eventLocation')?.value;
            const attendees = document.getElementById('eventAttendees')?.value;
            const recurrence = document.getElementById('eventRecurrence')?.value;
            const recurrenceEnd = document.getElementById('eventRecurrenceEnd')?.value;
            const reminder = document.getElementById('eventReminder')?.value;
            const calendarSelect = document.getElementById('eventCalendar');
            const connectionId = calendarSelect?.value;

            if (!title || !startDate || !endDate || !connectionId) {
                this.showToast('Please fill in all required fields', 'error');
                return;
            }

            const conn = this.connections.find(c => c.id === connectionId);
            if (!conn) {
                this.showToast('Calendar connection not found', 'error');
                return;
            }

            let startDateTime = new Date(`${startDate}${startTime ? 'T' + startTime : 'T00:00'}`);
            let endDateTime = new Date(`${endDate}${endTime ? 'T' + endTime : 'T23:59'}`);

            const eventData = {
                userId: this.userId,
                title,
                description,
                startDate: startDateTime.toISOString(),
                endDate: endDateTime.toISOString(),
                allDay,
                location,
                attendees: attendees ? attendees.split(/[,;]/).map(e => ({ email: e.trim() })) : [],
                color: '#667eea',
                recurrence: recurrence || 'none',
                recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd).toISOString() : null,
                reminder: reminder || 'none',
                connectionId,
                provider: conn.provider,
                calendarId: conn.id
            };

            const response = await fetch(`${this.apiBase}/calendar/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                this.events.set(result.event._id, {
                    id: result.event._id,
                    ...result.event,
                    startDate: new Date(result.event.startDate),
                    endDate: new Date(result.event.endDate)
                });
                this.showToast('Event created successfully', 'success');
                this.closeEventModal();
                this.renderCalendar();
                this.loadUpcomingEvents();
            } else {
                this.showToast(result.error || 'Failed to create event', 'error');
            }
        } catch (error) {
            console.error('Error saving event:', error);
            this.showToast('Failed to save event', 'error');
        }
    }

    async deleteEventFromDetail() {
        try {
            const eventId = document.getElementById('eventDetailContent')?.dataset.eventId;
            if (!eventId) return;

            if (!confirm('Are you sure you want to delete this event?')) return;

            const response = await fetch(`${this.apiBase}/calendar/events/${eventId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.status === 'success') {
                this.events.delete(eventId);
                this.showToast('Event deleted successfully', 'success');
                this.closeEventDetailModal();
                this.renderCalendar();
                this.loadUpcomingEvents();
            } else {
                this.showToast(result.error || 'Failed to delete event', 'error');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            this.showToast('Failed to delete event', 'error');
        }
    }

    async loadConnections() {
        try {
            const response = await fetch(`${this.apiBase}/calendar/connections`);
            const data = await response.json();
            if (data.status === 'success') {
                this.connections = data.connections;
                this.populateCalendarAccounts();
                this.populateEventCalendars();
            }
        } catch (error) {
            console.error('Failed to load connections:', error);
        }
    }

    async searchEvents(query) {
        if (!query.trim()) {
            this.renderCalendar();
            return;
        }

        try {
            const response = await fetch(
                `${this.apiBase}/calendar/search?userId=${this.userId}&query=${encodeURIComponent(query)}`
            );
            const data = await response.json();

            if (data.status === 'success') {
                this.events.clear();
                data.results.forEach(event => {
                    this.events.set(event._id, {
                        id: event._id,
                        ...event,
                        startDate: new Date(event.startDate),
                        endDate: new Date(event.endDate)
                    });
                });
                this.renderCalendar();
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    // =====================================================
    // CALENDAR RENDERING - MONTH, WEEK, DAY VIEWS
    // =====================================================

    renderCalendar() {
        switch (this.currentView) {
            case 'week':
                this.renderWeekView();
                break;
            case 'day':
                this.renderDayView();
                break;
            case 'month':
            default:
                this.renderMonthView();
        }
    }

    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        document.getElementById('monthName').textContent = this.getMonthName(month);
        document.getElementById('yearBadge').textContent = year;

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const startDay = monthStart.getDay();
        const daysInMonth = monthEnd.getDate();

        const container = document.getElementById('calendarDays');
        container.innerHTML = '';

        // Previous month days
        const prevMonthEnd = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            const day = prevMonthEnd - i;
            const cell = this.createDayCell(new Date(year, month - 1, day), true);
            container.appendChild(cell);
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const cell = this.createDayCell(date, false);
            container.appendChild(cell);
        }

        // Next month days
        const remainingCells = 42 - (startDay + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            const cell = this.createDayCell(new Date(year, month + 1, day), true);
            container.appendChild(cell);
        }
    }

    renderWeekView() {
        const weekStart = this.getWeekStart(this.currentDate);
        const container = document.getElementById('calendarDays');
        container.innerHTML = '';

        document.getElementById('monthName').textContent =
            `Week of ${this.formatDate(weekStart)}`;
        document.getElementById('yearBadge').textContent = weekStart.getFullYear();

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            weekDays.push(date);
        }

        weekDays.forEach(date => {
            const dayCell = this.createWeekDayCell(date);
            container.appendChild(dayCell);
        });
    }

    renderDayView() {
        const container = document.getElementById('calendarDays');
        container.innerHTML = '';

        document.getElementById('monthName').textContent = this.formatDate(this.currentDate);
        document.getElementById('yearBadge').textContent = this.currentDate.getFullYear();

        const dayCell = this.createFullDayCell(this.currentDate);
        container.appendChild(dayCell);
    }

    createDayCell(date, otherMonth) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        if (otherMonth) cell.classList.add('other-month');

        const isToday = this.isToday(date);
        if (isToday) cell.classList.add('today');

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        cell.appendChild(dayNumber);

        const dayEvents = document.createElement('div');
        dayEvents.className = 'day-events';

        const dateStr = this.formatDateKey(date);
        const dayEventsList = Array.from(this.events.values()).filter(evt => {
            const eventDate = new Date(evt.startDate);
            return this.formatDateKey(eventDate) === dateStr && this.selectedCalendars.has(evt.connectionId);
        });

        dayEventsList.slice(0, 3).forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = `day-event ${this.getProviderClass(event.provider)}`;
            eventEl.textContent = event.title;
            eventEl.style.cursor = 'pointer';
            eventEl.addEventListener('click', () => this.showEventDetail(event));
            dayEvents.appendChild(eventEl);
        });

        if (dayEventsList.length > 3) {
            const moreEl = document.createElement('div');
            moreEl.className = 'event-count';
            moreEl.textContent = `+${dayEventsList.length - 3} more`;
            dayEvents.appendChild(moreEl);
        }

        cell.appendChild(dayEvents);
        cell.addEventListener('click', () => this.openEventModal(date));

        return cell;
    }

    createWeekDayCell(date) {
        const cell = document.createElement('div');
        cell.className = 'week-day-cell';

        const header = document.createElement('div');
        header.className = 'week-day-header';
        header.innerHTML = `<strong>${this.getDayName(date.getDay())}</strong><br>${date.getDate()}`;
        cell.appendChild(header);

        const dayEvents = document.createElement('div');
        dayEvents.className = 'week-day-events';

        const dateStr = this.formatDateKey(date);
        const dayEventsList = Array.from(this.events.values()).filter(evt => {
            const eventDate = new Date(evt.startDate);
            return this.formatDateKey(eventDate) === dateStr && this.selectedCalendars.has(evt.connectionId);
        });

        dayEventsList.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = `week-event ${this.getProviderClass(event.provider)}`;
            eventEl.innerHTML = `<strong>${event.title}</strong><br>
                ${this.formatTime(new Date(event.startDate))} - ${this.formatTime(new Date(event.endDate))}`;
            eventEl.style.cursor = 'pointer';
            eventEl.addEventListener('click', () => this.showEventDetail(event));
            dayEvents.appendChild(eventEl);
        });

        cell.appendChild(dayEvents);
        return cell;
    }

    createFullDayCell(date) {
        const cell = document.createElement('div');
        cell.className = 'full-day-cell';

        const dateStr = this.formatDateKey(date);
        const dayEventsList = Array.from(this.events.values()).filter(evt => {
            const eventDate = new Date(evt.startDate);
            return this.formatDateKey(eventDate) === dateStr && this.selectedCalendars.has(evt.connectionId);
        });

        const header = document.createElement('div');
        header.className = 'full-day-header';
        header.innerHTML = `<h2>${this.getDayName(date.getDay())}, ${date.getDate()} ${this.getMonthName(date.getMonth())}</h2>`;
        cell.appendChild(header);

        const eventsList = document.createElement('div');
        eventsList.className = 'full-day-events-list';

        if (dayEventsList.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-state';
            emptyMsg.textContent = 'No events scheduled for this day';
            eventsList.appendChild(emptyMsg);
        } else {
            dayEventsList.forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.className = `full-day-event ${this.getProviderClass(event.provider)}`;
                eventEl.innerHTML = `
                    <div><strong>${event.title}</strong></div>
                    <div>${this.formatTime(new Date(event.startDate))} - ${this.formatTime(new Date(event.endDate))}</div>
                    <div>${event.description || 'No description'}</div>
                `;
                eventEl.style.cursor = 'pointer';
                eventEl.addEventListener('click', () => this.showEventDetail(event));
                eventsList.appendChild(eventEl);
            });
        }

        cell.appendChild(eventsList);
        return cell;
    }

    // =====================================================
    // MODAL METHODS
    // =====================================================

    openEventModal(date = null) {
        const modal = document.getElementById('eventModal');
        const form = document.getElementById('eventForm');
        if (form) form.reset();

        if (date) {
            const dateStr = date.toISOString().split('T')[0];
            const endDate = new Date(date);
            endDate.setHours(endDate.getHours() + 1);
            const endDateStr = endDate.toISOString().split('T')[0];

            const startDateEl = document.getElementById('eventStartDate');
            const endDateEl = document.getElementById('eventEndDate');
            if (startDateEl) startDateEl.value = dateStr;
            if (endDateEl) endDateEl.value = endDateStr;
        }

        if (modal) modal.classList.add('active');
    }

    closeEventModal() {
        const modal = document.getElementById('eventModal');
        if (modal) modal.classList.remove('active');
    }

    closeEventDetailModal() {
        const modal = document.getElementById('eventDetailModal');
        if (modal) modal.classList.remove('active');
    }

    showEventDetail(event) {
        const modal = document.getElementById('eventDetailModal');
        const title = document.getElementById('eventDetailTitle');
        const content = document.getElementById('eventDetailContent');

        if (title) title.textContent = event.title;

        if (content) {
            content.dataset.eventId = event.id;
            content.innerHTML = `
                <div class="event-detail-field">
                    <div class="event-detail-label">Title</div>
                    <div class="event-detail-value">${event.title}</div>
                </div>
                <div class="event-detail-field">
                    <div class="event-detail-label">Date</div>
                    <div class="event-detail-value">${this.formatDate(new Date(event.startDate))}</div>
                </div>
                <div class="event-detail-field">
                    <div class="event-detail-label">Time</div>
                    <div class="event-detail-value">${this.formatTime(new Date(event.startDate))} - ${this.formatTime(new Date(event.endDate))}</div>
                </div>
                ${event.location ? `<div class="event-detail-field">
                    <div class="event-detail-label">Location</div>
                    <div class="event-detail-value">${event.location}</div>
                </div>` : ''}
                ${event.description ? `<div class="event-detail-field">
                    <div class="event-detail-label">Description</div>
                    <div class="event-detail-value">${event.description}</div>
                </div>` : ''}
                ${event.attendees && event.attendees.length > 0 ? `<div class="event-detail-field">
                    <div class="event-detail-label">Attendees</div>
                    <div class="event-detail-value">${event.attendees.map(a => a.email).join(', ')}</div>
                </div>` : ''}
            `;
        }

        if (modal) modal.classList.add('active');
    }

    openSettingsModal() {
        const modal = document.getElementById('calendarSettingsModal');
        if (modal) modal.classList.add('active');
    }

    closeSettingsModal() {
        const modal = document.getElementById('calendarSettingsModal');
        if (modal) modal.classList.remove('active');
    }

    openSyncModal() {
        const modal = document.getElementById('syncModal');
        const list = document.getElementById('syncStatusList');

        if (list) {
            list.innerHTML = this.connections.map(conn => `
                <div style="padding: 10px; background: #f8f9fa; border-radius: 4px; margin-bottom: 10px;">
                    <div><strong>${conn.email}</strong> (${conn.provider})</div>
                    <div style="font-size: 12px; color: #666;">Status: ${conn.status}</div>
                </div>
            `).join('');
        }

        if (modal) modal.classList.add('active');
    }

    closeSyncModal() {
        const modal = document.getElementById('syncModal');
        if (modal) modal.classList.remove('active');
    }

    async startSync() {
        this.showToast('Sync started...', 'info');
        // Sync logic here
        await this.loadAllEvents();
        this.renderCalendar();
        this.closeSyncModal();
        this.showToast('Sync completed', 'success');
    }

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        this.renderCalendar();
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

        document.getElementById(`${tabName}Tab`)?.classList.add('active');
        event.target.classList.add('active');
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    populateCalendarAccounts() {
        const container = document.getElementById('calendarAccounts');
        if (!container) return;
        container.innerHTML = '';

        this.connections.forEach(conn => {
            const div = document.createElement('div');
            div.className = 'calendar-account-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.dataset.connectionId = conn.id;

            const color = document.createElement('div');
            color.className = 'calendar-account-color';
            color.style.backgroundColor = this.getProviderColor(conn.provider);

            const label = document.createElement('span');
            label.textContent = conn.email;

            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedCalendars.add(conn.id);
                } else {
                    this.selectedCalendars.delete(conn.id);
                }
                this.renderCalendar();
            });

            this.selectedCalendars.add(conn.id);

            div.appendChild(checkbox);
            div.appendChild(color);
            div.appendChild(label);
            container.appendChild(div);
        });
    }

    populateEventCalendars() {
        const select = document.getElementById('eventCalendar');
        if (!select) return;
        select.innerHTML = '<option value="">Select calendar</option>';

        this.connections.forEach(conn => {
            const option = document.createElement('option');
            option.value = conn.id;
            option.textContent = conn.email;
            select.appendChild(option);
        });
    }

    renderMiniCalendar() {
        const month = this.miniCalendarDate.getMonth();
        const year = this.miniCalendarDate.getFullYear();

        document.getElementById('miniMonth').textContent =
            `${this.getMonthName(month)} ${year}`;

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const startDay = monthStart.getDay();
        const daysInMonth = monthEnd.getDate();

        const container = document.getElementById('miniCalendarDays');
        if (!container) return;
        container.innerHTML = '';

        // Weekday headers
        ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach(day => {
            const header = document.createElement('div');
            header.className = 'mini-weekday';
            header.textContent = day;
            container.appendChild(header);
        });

        // Previous month days
        const prevMonthEnd = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            const day = prevMonthEnd - i;
            const cell = document.createElement('div');
            cell.className = 'mini-day other-month';
            cell.textContent = day;
            container.appendChild(cell);
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const cell = document.createElement('div');
            cell.className = 'mini-day';
            cell.textContent = day;

            if (this.isToday(date)) cell.classList.add('today');
            if (this.isSameDay(date, this.currentDate)) cell.classList.add('selected');

            cell.addEventListener('click', () => {
                this.currentDate = date;
                this.renderCalendar();
                this.renderMiniCalendar();
            });

            container.appendChild(cell);
        }

        // Next month days
        const remainingCells = 42 - (startDay + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            const cell = document.createElement('div');
            cell.className = 'mini-day other-month';
            cell.textContent = day;
            container.appendChild(cell);
        }
    }

    loadUpcomingEvents() {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const upcomingEvents = Array.from(this.events.values())
            .filter(evt => {
                const eventDate = new Date(evt.startDate);
                return eventDate >= today && eventDate <= nextWeek;
            })
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
            .slice(0, 5);

        const container = document.getElementById('upcomingEventsList');
        if (!container) return;
        container.innerHTML = '';

        if (upcomingEvents.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#666;">No upcoming events</p>';
            return;
        }

        upcomingEvents.forEach(event => {
            const item = document.createElement('div');
            item.className = 'upcoming-event-item';

            item.innerHTML = `
                <div class="upcoming-event-title">${event.title}</div>
                <div class="upcoming-event-time">${this.formatDate(new Date(event.startDate))}</div>
            `;

            item.style.borderLeftColor = this.getProviderColor(event.provider);
            item.addEventListener('click', () => this.showEventDetail(event));

            container.appendChild(item);
        });
    }

    getMonthName(month) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month];
    }

    getDayName(day) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[day];
    }

    formatDate(date) {
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }

    formatDateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    formatTime(date) {
        if (this.settings.show24HourTime) {
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
        const hours = date.getHours() % 12 || 12;
        const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
        return `${hours}:${String(date.getMinutes()).padStart(2, '0')} ${ampm}`;
    }

    getProviderColor(provider) {
        const colors = {
            'google-calendar': '#4285f4',
            'outlook-calendar': '#0078d4',
            'calendly': '#00d084',
            'calendly': '#00d084',
            'zoom': '#2d8cff',
            'monday': '#0055cc',
            'asana': '#273347',
            'trello': '#0079bf',
            'microsoft-teams': '#6264a7',
            'slack': '#36c5f0',
            'notion': '#000000'
        };
        return colors[provider] || '#667eea';
    }

    getProviderClass(provider) {
        return provider.toLowerCase().replace(/\s+/g, '-');
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    goToToday() {
        this.currentDate = new Date();
        this.renderCalendar();
        this.renderMiniCalendar();
    }

    previousMiniMonth() {
        this.miniCalendarDate.setMonth(this.miniCalendarDate.getMonth() - 1);
        this.renderMiniCalendar();
    }

    nextMiniMonth() {
        this.miniCalendarDate.setMonth(this.miniCalendarDate.getMonth() + 1);
        this.renderMiniCalendar();
    }

    editEventFromDetail() {
        const eventId = document.getElementById('eventDetailContent')?.dataset.eventId;
        if (!eventId) return;

        const event = this.events.get(eventId);
        if (!event) return;

        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventAttendees').value = event.attendees?.map(a => a.email).join(', ') || '';

        const startDate = new Date(event.startDate);
        document.getElementById('eventStartDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('eventStartTime').value = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

        const endDate = new Date(event.endDate);
        document.getElementById('eventEndDate').value = endDate.toISOString().split('T')[0];
        document.getElementById('eventEndTime').value = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

        document.getElementById('eventAllDay').checked = event.allDay;
        document.getElementById('eventRecurrence').value = event.recurrence;

        this.closeEventDetailModal();
        this.openEventModal();
    }

    saveSettings() {
        localStorage.setItem('calendarSettings', JSON.stringify(this.settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('calendarSettings');
        if (saved) {
            this.settings = JSON.parse(saved);
            document.getElementById('showWeekends').checked = this.settings.showWeekends;
            document.getElementById('show24HourTime').checked = this.settings.show24HourTime;
            document.getElementById('weekStartDay').value = this.settings.weekStartDay;
            document.getElementById('defaultEventDuration').value = this.settings.defaultEventDuration;
        }
    }

    addCalendarAccount() {
        this.showToast('Opening calendar provider selector...', 'info');
        // Navigate to provider selection or open OAuth flow
    }

    searchEvents(query) {
        if (!query.trim()) {
            this.renderCalendar();
            return;
        }

        const filtered = new Map();
        this.events.forEach((event, id) => {
            if (event.title.toLowerCase().includes(query.toLowerCase()) ||
                event.description?.toLowerCase().includes(query.toLowerCase()) ||
                event.location?.toLowerCase().includes(query.toLowerCase())) {
                filtered.set(id, event);
            }
        });

        const tempEvents = this.events;
        this.events = filtered;
        this.renderCalendar();
        this.events = tempEvents;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<div class="toast-message">${message}</div>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.calendarView = new CalendarView();
});
