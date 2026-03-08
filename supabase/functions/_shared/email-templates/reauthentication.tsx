/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1';
import { Html, Head, Body, Container, Section, Text, Img, Hr } from 'npm:@react-email/components@0.0.22';

interface ReauthenticationEmailProps {
  siteName: string;
  siteUrl: string;
  token: string;
  recipient: string;
}

export default function ReauthenticationEmail({ siteName = 'Card-Ex', siteUrl = 'https://tagex.app', token = '', recipient = '' }: ReauthenticationEmailProps) {
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
            <Text style={heading}>Verification Code</Text>
            <Text style={paragraph}>
              Use the code below to verify your identity on Card-Ex.
            </Text>
            <Section style={codeContainer}>
              <Text style={codeText}>{token}</Text>
            </Section>
            <Text style={smallText}>
              This code expires in 10 minutes. If you didn't request this, please secure your account.
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
const codeContainer: React.CSSProperties = { textAlign: 'center' as const, margin: '24px 0', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '12px' };
const codeText: React.CSSProperties = { fontSize: '32px', fontWeight: '700', color: '#0a0a0b', letterSpacing: '6px', margin: '0' };
const smallText: React.CSSProperties = { fontSize: '13px', lineHeight: '1.5', color: '#8b8d93', margin: '24px 0 0' };
const footer: React.CSSProperties = { paddingTop: '24px', textAlign: 'center' as const };
const footerText: React.CSSProperties = { fontSize: '12px', color: '#8b8d93', margin: '0' };
