/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1';
import { Html, Head, Body, Container, Section, Text, Button, Img, Hr } from 'npm:@react-email/components@0.0.22';

interface RecoveryEmailProps {
  siteName: string;
  siteUrl: string;
  confirmationUrl: string;
  recipient: string;
}

export default function RecoveryEmail({ siteName = 'Card-Ex', siteUrl = 'https://tagex.app', confirmationUrl = '', recipient = '' }: RecoveryEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Img src={`${siteUrl}/favicon.png`} width="48" height="48" alt="Card-Ex" style={logo} />
            <Text style={brandName}>Card-Ex</Text>
          </Section>
          <Hr style={divider} />
          <Section style={contentSection}>
            <Text style={heading}>Reset Your Password</Text>
            <Text style={paragraph}>
              We received a request to reset your Card-Ex password. Tap the button below to choose a new one.
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={confirmationUrl}>
                Reset Password
              </Button>
            </Section>
            <Text style={smallText}>
              If you didn't request a password reset, you can safely ignore this email. Your password won't change.
            </Text>
          </Section>
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>© {new Date().getFullYear()} Card-Ex · Tagex.app</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' };
const container: React.CSSProperties = { margin: '0 auto', padding: '40px 24px', maxWidth: '480px' };
const headerSection: React.CSSProperties = { textAlign: 'center' as const, paddingBottom: '24px' };
const logo: React.CSSProperties = { margin: '0 auto', borderRadius: '12px' };
const brandName: React.CSSProperties = { fontSize: '20px', fontWeight: '700', color: '#0a0a0b', margin: '8px 0 0' };
const divider: React.CSSProperties = { borderColor: '#e5e5e5', margin: '0' };
const contentSection: React.CSSProperties = { padding: '32px 0' };
const heading: React.CSSProperties = { fontSize: '24px', fontWeight: '700', color: '#0a0a0b', margin: '0 0 16px' };
const paragraph: React.CSSProperties = { fontSize: '16px', lineHeight: '1.6', color: '#55575d', margin: '0 0 16px' };
const buttonContainer: React.CSSProperties = { textAlign: 'center' as const, margin: '24px 0' };
const button: React.CSSProperties = { backgroundColor: 'hsl(45, 72%, 53%)', color: '#0a0a0b', fontSize: '16px', fontWeight: '600', textDecoration: 'none', borderRadius: '16px', padding: '14px 32px', display: 'inline-block' };
const smallText: React.CSSProperties = { fontSize: '13px', lineHeight: '1.5', color: '#8b8d93', margin: '24px 0 0' };
const footer: React.CSSProperties = { paddingTop: '24px', textAlign: 'center' as const };
const footerText: React.CSSProperties = { fontSize: '12px', color: '#8b8d93', margin: '0' };
