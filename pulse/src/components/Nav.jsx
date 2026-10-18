import React from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import HistoryIcon from '@mui/icons-material/History';
import InsightsIcon from '@mui/icons-material/Insights';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BiotechIcon from '@mui/icons-material/Biotech';
import PulseLine from './PulseLine';
import { tokens } from '../theme';
import brand from '../brand';

const TESTING_VIEW = -1;

/**
 * App header with PulseLine logo and responsive navigation.
 * Mobile (≤600px): BottomNavigation fixed to bottom.
 * Desktop: Tabs in the header.
 */
export default function Nav({ view, onChangeView, onOpenTesting }) {
  const isMobile = useMediaQuery('(max-width:600px)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const handleChange = (_, v) => {
    if (v === TESTING_VIEW) {
      onOpenTesting();
    } else {
      onChangeView(v);
    }
  };

  return (
    <>
      {/* App header */}
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderBottom: `1px solid ${tokens.borderViolet}`,
          backgroundColor: 'rgba(20,20,28,0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PulseLine width={120} height={28} animate={!prefersReducedMotion} />
          <Typography
            variant="h5"
            sx={{
              fontSize: { xs: '1.1rem', sm: '1.3rem' },
              fontWeight: 700,
              background: `linear-gradient(135deg, ${tokens.violet} 0%, ${tokens.violetBright} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {brand.name}
          </Typography>
        </Box>

        {/* Desktop tabs */}
        {!isMobile && (
          <Tabs
            value={view}
            onChange={handleChange}
            aria-label="Main navigation"
          >
            <Tab icon={<DashboardIcon />} iconPosition="start" label="Dashboard" value={0} id="nav-dashboard" />
            <Tab icon={<AddCircleOutlineIcon />} iconPosition="start" label="Log" value={1} id="nav-log" />
            <Tab icon={<HistoryIcon />} iconPosition="start" label="History" value={2} id="nav-history" />
            <Tab icon={<InsightsIcon />} iconPosition="start" label="Summary" value={3} id="nav-summary" />
            <Tab icon={<CalendarMonthIcon />} iconPosition="start" label="Workout Planner" value={4} id="nav-planner" />
          </Tabs>
        )}
      </Box>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <BottomNavigation
          value={view}
          onChange={handleChange}
          showLabels
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
          }}
        >
          <BottomNavigationAction label="Dashboard" icon={<DashboardIcon />} id="nav-mobile-dashboard" />
          <BottomNavigationAction label="Log" icon={<AddCircleOutlineIcon />} id="nav-mobile-log" />
          <BottomNavigationAction label="History" icon={<HistoryIcon />} id="nav-mobile-history" />
          <BottomNavigationAction label="Summary" icon={<InsightsIcon />} id="nav-mobile-summary" />
          <BottomNavigationAction label="Workouts" icon={<CalendarMonthIcon />} id="nav-mobile-planner" />
        </BottomNavigation>
      )}
    </>
  );
}
