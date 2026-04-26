import { Box, MenuItem, TextField, Typography } from '@mui/material';

const PURPLE = '#8B2FBE';
const BORDER = '#EDE9F8';
const BG = '#F8F6FF';

function OccurrenceScheduleEditor({
  schedule,
  setSchedule,
  venues,
  disabled,
  onRemoveOccurrence,
  statusFilter = null,
  showAddButton = true,
  showActionButton = true,
  readOnly = false,
  muted = false,
  onBeforeAddOccurrence = null,
  onAddOccurrenceValidationError = null,
}) {
  const visibleItems = schedule
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => (statusFilter ? statusFilter(item) : true));

  const update = (scheduleIndex, field, value) => {
    const next = schedule.map((item, i) => (i === scheduleIndex ? { ...item, [field]: value } : item));
    setSchedule(next);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 1.75 }}>
      {visibleItems.map(({ item, index: scheduleIndex }, index) => {
          const isCancelled = item.status === 'CANCELLED';
          const isReadOnly = disabled || readOnly || isCancelled;
          const canRemoveUnsaved = item.id == null && visibleItems.length > 1;
          const canCancelExisting = item.id != null && !isCancelled;
          const removeDisabled = disabled || (!canRemoveUnsaved && !canCancelExisting);
          return (
        <Box
          key={item.id != null ? `occ-${item.id}` : `new-${index}`}
          sx={{
            display: 'grid',
            gridTemplateColumns: showActionButton ? '28px 1fr 110px 1fr 36px' : '28px 1fr 110px 1fr',
            gap: 1.25, alignItems: 'center',
            bgcolor: muted ? '#FAFAFA' : BG,
            borderRadius: '10px',
            p: '10px 14px',
            border: `1px solid ${BORDER}`,
            opacity: muted ? 0.78 : 1,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'center' }}>
            {index + 1}.
          </Typography>
          <TextField
            type="date" value={item.date} size="small"
            onChange={(e) => update(scheduleIndex, 'date', e.target.value)}
            disabled={isReadOnly}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="time" value={item.time} size="small"
            onChange={(e) => update(scheduleIndex, 'time', e.target.value)}
            disabled={isReadOnly}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            select value={item.venueId} size="small" label="Venue"
            onChange={(e) => update(scheduleIndex, 'venueId', e.target.value)}
            disabled={isReadOnly}
          >
            {venues.map((v) => <MenuItem key={v.id} value={String(v.id)}>{v.name}</MenuItem>)}
          </TextField>
          {showActionButton ? (
            <Box
              component="button"
              type="button"
              onClick={() => {
                if (onRemoveOccurrence) {
                  onRemoveOccurrence(scheduleIndex, item);
                  return;
                }
                setSchedule(schedule.filter((_, i) => i !== scheduleIndex));
              }}
              disabled={removeDisabled}
              sx={{
                width: 32, height: 32, border: 'none', borderRadius: '8px',
                bgcolor: isCancelled ? '#FEF3C7' : '#FEE2E2',
                color: isCancelled ? '#B45309' : '#EF4444',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isCancelled ? '0.625rem' : '1rem',
                fontWeight: 700,
                '&:disabled': { opacity: 0.4, cursor: 'not-allowed' },
              }}
            >
              {isCancelled ? 'CXL' : '×'}
            </Box>
          ) : null}
        </Box>
          );
        })}

      {showAddButton ? (
        <Box
          component="button"
          type="button"
          onClick={() => {
            if (onBeforeAddOccurrence) {
              const message = onBeforeAddOccurrence(schedule);
              if (message) {
                if (onAddOccurrenceValidationError) onAddOccurrenceValidationError(message);
                return;
              }
            }
            setSchedule([...schedule, { date: '', time: '', venueId: '', status: 'SCHEDULED' }]);
          }}
          disabled={disabled}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1,
            border: `1.5px dashed ${BORDER}`, borderRadius: '8px',
            bgcolor: 'transparent', color: 'text.secondary', fontSize: '0.8125rem', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            '&:hover': { borderColor: PURPLE, color: PURPLE },
            '&:disabled': { opacity: 0.4, cursor: 'not-allowed' },
          }}
        >
          + Add Occurrence
        </Box>
      ) : null}
    </Box>
  );
}

export default OccurrenceScheduleEditor;
