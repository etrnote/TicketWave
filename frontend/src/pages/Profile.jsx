import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generatePaymentToken, paymentService } from '../services/paymentService';
import { userService } from '../services/api';

function formatCardNumber(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.error ?? error?.response?.data?.message ?? error?.message ?? fallback;
}

function Profile() {
  const queryClient = useQueryClient();

  const [nameDraft, setNameDraft] = useState(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [formError, setFormError] = useState('');

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    error: profileErrorObj,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await userService.getProfile()).data,
  });

  const {
    data: paymentMethods = [],
    isLoading: paymentMethodsLoading,
    isError: paymentMethodsError,
    error: paymentMethodsErrorObj,
  } = useQuery({
    queryKey: ['userPaymentMethods'],
    queryFn: async () => (await userService.getPaymentMethods()).data,
  });

  const updateNameMutation = useMutation({
    mutationFn: async (name) => (await userService.updateProfile({ name })).data,
    onSuccess: (updated) => {
      setNameDraft(null);
      queryClient.setQueryData(['profile'], updated);
    },
  });

  const addPaymentMethodMutation = useMutation({
    mutationFn: async ({ inputCardNumber, inputExpiry, inputCvv }) => {
      const paymentDetails = await paymentService.processPayment({
        cardNumber: inputCardNumber,
        expiry: inputExpiry,
        cvv: inputCvv,
      });
      return (await userService.addPaymentMethod({
        cardType: paymentDetails.cardType,
        lastFour: paymentDetails.lastFour,
        token: generatePaymentToken(),
      })).data;
    },
    onSuccess: () => {
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['userPaymentMethods'] });
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, 'Failed to save payment method.'));
    },
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: (methodId) => userService.deletePaymentMethod(methodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPaymentMethods'] });
    },
  });

  const nameInputValue = nameDraft ?? (profile?.name ?? '');

  const isSaveNameDisabled = useMemo(
    () =>
      updateNameMutation.isPending
      || !nameInputValue.trim()
      || nameInputValue.trim() === (profile?.name ?? ''),
    [updateNameMutation.isPending, nameInputValue, profile?.name],
  );

  const isSaveCardDisabled = useMemo(
    () =>
      addPaymentMethodMutation.isPending
      || !cardNumber.trim()
      || !expiry.trim()
      || !cvv.trim(),
    [addPaymentMethodMutation.isPending, cardNumber, expiry, cvv],
  );

  const handleSaveName = () => {
    setFormError('');
    updateNameMutation.mutate(nameInputValue.trim());
  };

  const handleAddCard = () => {
    setFormError('');
    addPaymentMethodMutation.mutate({
      inputCardNumber: cardNumber,
      inputExpiry: expiry,
      inputCvv: cvv,
    });
  };

  if (profileLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (profileError) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{getErrorMessage(profileErrorObj, 'Failed to load your profile.')}</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
          Profile
        </Typography>

        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Name"
                value={nameInputValue}
                onChange={(e) => setNameDraft(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Email"
                value={profile?.email ?? ''}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip label={profile?.role ?? 'USER'} color="primary" variant="outlined" />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSaveName}
              disabled={isSaveNameDisabled}
            >
              {updateNameMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </Box>
          {updateNameMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {getErrorMessage(updateNameMutation.error, 'Failed to update your name.')}
            </Alert>
          )}
          {updateNameMutation.isSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Name updated.
            </Alert>
          )}
        </Paper>

        <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Payment Methods
          </Typography>

          {paymentMethodsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getErrorMessage(paymentMethodsErrorObj, 'Failed to load payment methods.')}
            </Alert>
          )}

          {paymentMethodsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : paymentMethods.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              No saved cards yet.
            </Alert>
          ) : (
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              {paymentMethods.map((method) => (
                <Grid item xs={12} key={method.id}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: '12px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {method.cardType} •••• {method.lastFour}
                        </Typography>
                        <IconButton
                          color="error"
                          onClick={() => deletePaymentMethodMutation.mutate(method.id)}
                          disabled={deletePaymentMethodMutation.isPending}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
            Add Card
          </Typography>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          {deletePaymentMethodMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getErrorMessage(deletePaymentMethodMutation.error, 'Failed to delete payment method.')}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Card Number"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                inputProps={{ inputMode: 'numeric', maxLength: 19 }}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CreditCardIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Expiry (MM/YY)"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                inputProps={{ inputMode: 'numeric', maxLength: 5 }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="CVV"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                inputProps={{ inputMode: 'numeric', maxLength: 4 }}
                fullWidth
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleAddCard}
              disabled={isSaveCardDisabled}
            >
              {addPaymentMethodMutation.isPending ? 'Saving…' : 'Save Card'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default Profile;
