import { Container, Typography, Box } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

function PlaceholderPage({ title }) {
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10, textAlign: 'center' }}>
        <ConstructionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page is currently in development. Please check back later.
        </Typography>
      </Box>
    </Container>
  );
}

export default PlaceholderPage;
