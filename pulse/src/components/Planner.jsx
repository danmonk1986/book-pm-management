import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AutoRescheduleIcon from '@mui/icons-material/Autorenew';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TimerIcon from '@mui/icons-material/Timer';
import CloseIcon from '@mui/icons-material/Close';
import MovedWorkoutDialog from './MovedWorkoutDialog';
import { tokens } from '../theme';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday',
];

const DAY_SHORT = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

function fromDayShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_SHORT[DAYS_OF_WEEK[(d.getDay() + 6) % 7]];
}

export default function Planner({ planner, onAddEntry }) {
  const {
    loaded,
    availability,
    schedule,
    settings,
    workouts,
    messages,
    scheduleByDate,
    todayStr,
    generateWeek,
    saveSetup,
    checkIn,
    updateAvailability,
    getWeekDates: plannerGetWeekDates,
    dateToDayOfWeek: plannerDateToDayOfWeek,
    formatDate: plannerFormatDate,
    isWorkoutDone,
    activeMessage,
    clearActiveMessage,
  } = planner;

  const [weekOffset, setWeekOffset] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const [tempAvail, setTempAvail] = useState({});
  const [tempTarget, setTempTarget] = useState(3);
  const [detailsWorkout, setDetailsWorkout] = useState(null);

  const weekDates = useMemo(() => plannerGetWeekDates(weekOffset), [weekOffset, plannerGetWeekDates]);

  const weekAvailability = useMemo(() => {
    return weekDates.map((dateStr) => {
      const dow = plannerDateToDayOfWeek(dateStr);
      return { dateStr, dayOfWeek: dow, available: availability[dow] ?? false };
    });
  }, [weekDates, availability, plannerDateToDayOfWeek]);

  const activeWorkouts = useMemo(
    () => [...workouts].sort((a, b) => a.order_index - b.order_index),
    [workouts]
  );

  useEffect(() => {
    if (loaded && settings.setup_complete && workouts.length > 0 && Object.keys(availability).length > 0) {
      generateWeek(plannerGetWeekDates(0));
    }
  // `schedule` is a dependency so the week is filled again if another update
  // (e.g. marking last week's workouts missed) overwrites it in the same pass.
  // generateWeek only adds what's missing, so this settles after one fill.
  }, [loaded, settings, workouts, availability, schedule]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loaded && settings.setup_complete && weekOffset !== 0) {
      generateWeek(weekDates);
    }
  }, [weekOffset, loaded, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────────

  const handleComplete = useCallback((e) => {
    e.stopPropagation();
    checkIn(onAddEntry);
  }, [checkIn, onAddEntry]);

  const handleOpenSetup = useCallback(() => {
    setTempAvail({ ...availability });
    setTempTarget(settings?.weekly_target ?? 3);
    setSetupOpen(true);
  }, [availability, settings]);

  const handleSaveSetup = useCallback(() => {
    if (settings?.setup_complete) {
      updateAvailability(tempAvail, tempTarget);
    } else {
      saveSetup(tempAvail, tempTarget);
    }
    setSetupOpen(false);
  }, [tempAvail, tempTarget, settings, saveSetup, updateAvailability]);

  const handleToggleDay = useCallback((day) => {
    setTempAvail((prev) => ({ ...prev, [day]: !prev[day] }));
  }, []);

  // ── Computed ───────────────────────────────────────────────────

  const weekStats = useMemo(() => {
    const weekEntries = weekDates.map((d) => scheduleByDate[d]).filter(Boolean);
    const completed = weekEntries.filter((s) => isWorkoutDone(s.scheduled_date)).length;
    const pending = weekEntries.filter((s) => s.status === 'pending' && !isWorkoutDone(s.scheduled_date)).length;
    const missed = weekEntries.filter((s) => s.status === 'missed').length;

    // A missed workout that was moved leaves two entries (the missed original
    // and its moved copy). Count that workout once by skipping the copy.
    // Availability moves update the workout in place, so nothing to skip.
    const movedCopyCount = weekEntries.filter(
      (s) => s.is_moved && s.moved_from_date
        && weekEntries.some((o) => o.id !== s.id && o.scheduled_date === s.moved_from_date && o.status === 'missed')
    ).length;

    const total = weekEntries.length - movedCopyCount;
    return { completed, pending, missed, total };
  }, [weekDates, scheduleByDate, isWorkoutDone]);

  const isAdaptive = settings?.group_assignment === 'adaptive';

  // ── Render ─────────────────────────────────────────────────────

  if (!loaded) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 3 }}>
        <Typography variant="h5" sx={{ fontSize: '1.2rem', mb: 3 }}>Workout Planner</Typography>
        <LinearProgress sx={{ maxWidth: 300 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Loading your plan…</Typography>
      </Box>
    );
  }

  // Show onboarding if setup not complete
  if (!settings?.setup_complete) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, py: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontSize: '1.2rem', mb: 0.5 }}>Workout Planner</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            {messages.setup_welcome}
          </Typography>
        </Box>
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
                Which days can you work out?
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {DAYS_OF_WEEK.map((day) => (
                  <Chip
                    key={day}
                    label={DAY_SHORT[day]}
                    onClick={() => handleToggleDay(day)}
                    color={tempAvail[day] ? 'primary' : 'default'}
                    variant={tempAvail[day] ? 'filled' : 'outlined'}
                    id={`setup-avail-${day}`}
                    sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
                Weekly target: {tempTarget} workout{tempTarget === 1 ? '' : 's'}
              </Typography>
              <ToggleButtonGroup
                value={String(tempTarget)}
                exclusive
                onChange={(_, v) => v && setTempTarget(parseInt(v, 10))}
                size="small"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <ToggleButton key={n} value={String(n)} id={`setup-target-${n}`} sx={{ fontSize: '0.75rem', fontFamily: '"Space Grotesk", sans-serif' }}>
                    {n}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <Button variant="contained" onClick={handleSaveSetup} id="setup-complete-button" size="large">
              Start my plan
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontSize: '1.2rem', mb: 0.5 }}>Workout Planner</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
          {isAdaptive
            ? 'Your plan adapts to your week. Missed workouts move to your next available day.'
            : 'Your weekly plan is set. Miss a day and it stays missed — next week starts fresh.'}
        </Typography>
      </Box>

      {/* Group badge + setup button */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip
          label={isAdaptive ? 'Adaptive group' : 'Fixed plan group'}
          size="small"
          sx={{
            fontSize: '0.7rem',
            fontFamily: '"Space Grotesk", sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: isAdaptive ? tokens.violetBright : '#8E8EA0',
            border: '1px solid',
            borderColor: isAdaptive ? tokens.accentBorder40 : tokens.borderViolet,
            backgroundColor: isAdaptive ? tokens.accentDim08 : 'transparent',
          }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<CalendarTodayIcon />}
          onClick={handleOpenSetup}
          id="planner-setup-button"
        >
          Edit availability
        </Button>
      </Box>

      {/* Supportive message banner */}
      {activeMessage && messages[activeMessage] && (
        <Alert
          severity="info"
          sx={{ mb: 2, '& .MuiAlert-message': { fontSize: '0.85rem' } }}
          onClose={clearActiveMessage}
          icon={<AutoRescheduleIcon fontSize="small" />}
        >
          {messages[activeMessage]}
        </Alert>
      )}

      {/* Week navigation + stats */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week" id="planner-prev-week">
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontSize: '0.85rem' }}>
            {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : `${weekOffset > 0 ? '+' : ''}${weekOffset} w`}
          </Typography>
          <IconButton size="small" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week" id="planner-next-week">
            <ChevronRightIcon />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label={`${weekStats.completed}/${weekStats.total} done`} size="small"
            sx={{ fontSize: '0.7rem', borderColor: tokens.borderViolet, color: '#4ADE80', border: '1px solid', backgroundColor: 'transparent' }} />
          {weekStats.missed > 0 && (
            <Chip label={`${weekStats.missed} missed`} size="small"
              sx={{ fontSize: '0.7rem', borderColor: tokens.borderViolet, color: '#FBBF24', border: '1px solid', backgroundColor: 'transparent' }} />
          )}
        </Box>
      </Box>

      {/* Week grid */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {weekAvailability.map(({ dateStr, dayOfWeek, available }) => {
          const entry = scheduleByDate[dateStr];
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const done = isWorkoutDone(dateStr);

          return (
            <Box key={dateStr} sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(33.333% - 10px)', md: '1 1 calc(14.285% - 13px)' }, minWidth: { xs: 140, md: 100 } }}>
              <Card id={`planner-day-${dateStr}`} sx={{
                height: '100%',
                borderColor: isToday ? tokens.accentBorder40 : tokens.borderViolet,
                borderWidth: isToday ? 2 : 1,
                opacity: !available && !entry ? 0.5 : 1,
              }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography sx={{ fontSize: '0.65rem', fontFamily: '"Space Grotesk", sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary', mb: 0.25 }}>
                    {DAY_SHORT[dayOfWeek]}
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, mb: 1, color: isToday ? tokens.violetBright : 'text.primary' }}>
                    {plannerFormatDate(dateStr)}
                  </Typography>

                  {!available && !entry && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Off day</Typography>
                    </Box>
                  )}

                  {available && !entry && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Open</Typography>
                    </Box>
                  )}

                  {entry && (
                    <Box
                      onClick={() => entry.workout && setDetailsWorkout(entry.workout)}
                      sx={{ cursor: entry.workout ? 'pointer' : 'default' }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <FitnessCenterIcon sx={{ fontSize: 16, color: 'primary.light' }} />
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.2 }}>
                          {entry.workout?.name || 'Workout'}
                        </Typography>
                      </Box>

                      <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', mb: 0.5 }}>
                        {entry.workout?.length} min
                      </Typography>

                      {entry.is_moved && entry.moved_from_date && (
                        <Chip
                          icon={<SwapHorizIcon sx={{ fontSize: 13 }} />}
                          label={`From ${fromDayShort(entry.moved_from_date)}`}
                          size="small"
                          sx={{
                            fontSize: '0.6rem', height: 20, mb: 0.5,
                            color: tokens.violetBright,
                            border: '1px solid', borderColor: tokens.accentBorder40,
                            backgroundColor: tokens.accentDim08,
                          }}
                        />
                      )}

                      {done && (
                        <Chip icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} label="Done" size="small"
                          sx={{ fontSize: '0.65rem', height: 22, color: '#4ADE80', border: '1px solid', borderColor: 'rgba(74,222,128,0.3)', backgroundColor: 'rgba(74,222,128,0.08)' }} />
                      )}
                      {entry.status === 'missed' && !done && (
                        <Chip icon={<EventBusyIcon sx={{ fontSize: 14 }} />} label="Missed" size="small"
                          sx={{ fontSize: '0.65rem', height: 22, color: '#FBBF24', border: '1px solid', borderColor: 'rgba(251,191,36,0.3)', backgroundColor: 'rgba(251,191,36,0.08)' }} />
                      )}
                      {entry.status === 'pending' && isPast && !done && (
                        <Chip label="Overdue" size="small"
                          sx={{ fontSize: '0.65rem', height: 22, color: '#F87171', border: '1px solid', borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.08)' }} />
                      )}

                      {entry.status === 'pending' && !done && !isPast && (
                        <Button size="small" variant="outlined" fullWidth
                          onClick={handleComplete}
                          id={`complete-button-${entry.id}`}
                          sx={{ fontSize: '0.65rem', mt: 0.5, py: 0.25 }}>
                          Check in
                        </Button>
                      )}

                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>

      {/* Plan reference */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Your Beginner Plan
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {activeWorkouts.map((w) => (
            <Card key={w.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 11px)' } }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <FitnessCenterIcon sx={{ fontSize: 20, color: 'primary.light' }} />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{w.name}</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1 }}>
                  {w.length} min
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', lineHeight: 1.4, mb: 0.5 }}>
                  <strong>Warm-up:</strong> {w.warmup}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', lineHeight: 1.4, mb: 0.5 }}>
                  <strong>Main:</strong> {w.main}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                  <strong>Cool-down:</strong> {w.cooldown}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Availability edit dialog */}
      <Dialog open={setupOpen} onClose={() => setSetupOpen(false)} maxWidth="xs" fullWidth id="planner-setup-dialog">
        <DialogTitle sx={{ fontFamily: '"Space Grotesk", sans-serif', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '1rem' }}>
          Edit Availability
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.85rem' }}>
            Tap the days you can work out. The planner will update your schedule to match.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {DAYS_OF_WEEK.map((day) => (
              <Chip
                key={day}
                label={DAY_SHORT[day]}
                onClick={() => handleToggleDay(day)}
                color={tempAvail[day] ? 'primary' : 'default'}
                variant={tempAvail[day] ? 'filled' : 'outlined'}
                id={`edit-avail-${day}`}
                sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: '0.75rem' }}
              />
            ))}
          </Box>
          {settings?.setup_complete && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.85rem' }}>
                Weekly target: {tempTarget}
              </Typography>
              <ToggleButtonGroup value={String(tempTarget)} exclusive onChange={(_, v) => v && setTempTarget(parseInt(v, 10))} size="small">
                {[1, 2, 3, 4, 5].map((n) => (
                  <ToggleButton key={n} value={String(n)} id={`edit-target-${n}`} sx={{ fontSize: '0.75rem', fontFamily: '"Space Grotesk", sans-serif' }}>
                    {n}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setSetupOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSetup} id="planner-setup-save">Save</Button>
        </DialogActions>
      </Dialog>

      <MovedWorkoutDialog planner={planner} />

      {/* Workout details dialog */}
      <Dialog
        open={Boolean(detailsWorkout)}
        onClose={() => setDetailsWorkout(null)}
        maxWidth="sm"
        fullWidth
        id="workout-details-dialog"
      >
        {detailsWorkout && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FitnessCenterIcon sx={{ color: 'primary.light' }} />
                <Box>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>{detailsWorkout.name}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TimerIcon sx={{ fontSize: 14 }} /> {detailsWorkout.length} min
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => setDetailsWorkout(null)}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: '0.7rem', fontFamily: '"Space Grotesk", sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', color: tokens.violetBright, mb: 0.5 }}>
                  Warm-up (5 min)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {detailsWorkout.warmup}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: '0.7rem', fontFamily: '"Space Grotesk", sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', color: tokens.violetBright, mb: 0.5 }}>
                  Main (20 min)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {detailsWorkout.main}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.7rem', fontFamily: '"Space Grotesk", sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', color: tokens.violetBright, mb: 0.5 }}>
                  Cool-down (5 min)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {detailsWorkout.cooldown}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={() => setDetailsWorkout(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
