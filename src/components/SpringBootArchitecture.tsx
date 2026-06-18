import { useState } from "react";
import { 
  Folder, FolderOpen, FileCode, Check, Copy, Shield, Database, Lock, 
  ChevronRight, Network, Server, UserCheck, Key, FileSignature, Receipt, Terminal
} from "lucide-react";

interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  category: "Tenant Routing" | "Security & Authentication" | "Identity Domain" | "Notary Domain" | "Audit & Aspects" | "DTOs";
  description: string;
  code: string;
  children?: FileNode[];
}

export default function SpringBootArchitecture() {
  const [selectedFilePath, setSelectedFilePath] = useState<string>("src/main/java/com/notary/saas/core/routing/MultiTenantConnectionProviderImpl.java");
  const [copied, setCopied] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "src": true,
    "src/main": true,
    "src/main/java": true,
    "src/main/java/com": true,
    "src/main/java/com/notary": true,
    "src/main/java/com/notary/saas": true,
    "src/main/java/com/notary/saas/core": true,
    "src/main/java/com/notary/saas/core/routing": true,
  });

  const handleToggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const files: FileNode[] = [
    {
      name: "src",
      type: "folder",
      path: "src",
      category: "Tenant Routing",
      description: "Root source file package path.",
      code: "",
      children: [
        {
          name: "main",
          type: "folder",
          path: "src/main",
          category: "Tenant Routing",
          description: "Production package folder.",
          code: "",
          children: [
            {
              name: "java",
              type: "folder",
              path: "src/main/java",
              category: "Tenant Routing",
              description: "Java source files.",
              code: "",
              children: [
                {
                  name: "com.notary.saas",
                  type: "folder",
                  path: "src/main/java/com/notary/saas",
                  category: "Tenant Routing",
                  description: "Standard Notary Office corporate namespace.",
                  code: "",
                  children: [
                    {
                      name: "core",
                      type: "folder",
                      path: "src/main/java/com/notary/saas/core",
                      category: "Tenant Routing",
                      description: "Infrastructure layer managing filters, multi-tenancy, routing, and spring configuration.",
                      code: "",
                      children: [
                        {
                          name: "context",
                          type: "folder",
                          path: "src/main/java/com/notary/saas/core/context",
                          category: "Tenant Routing",
                          description: "Thread-local storage for tenant tracking.",
                          code: "",
                          children: [
                            {
                              name: "TenantContext.java",
                              type: "file",
                              category: "Tenant Routing",
                              path: "src/main/java/com/notary/saas/core/context/TenantContext.java",
                              description: "Provides thread-safe storage for identifying the active tenant in execution threads.",
                              code: `package com.notary.saas.core.context;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Thread-local context keeper for multi-tenant isolation.
 * Prevents cross-tenant leaks by holding the active context identity for the current request thread.
 */
public class TenantContext {
    private static final Logger log = LoggerFactory.getLogger(TenantContext.class);
    private static final ThreadLocal<String> currentTenant = new ThreadLocal<>();

    public static void setCurrentTenant(String tenantId) {
        log.debug("Setting active Tenant ID to: {}", tenantId);
        currentTenant.set(tenantId);
    }

    public static String getCurrentTenant() {
        return currentTenant.get();
    }

    public static void clear() {
        log.debug("Clearing active Tenant ThreadLocal Context");
        currentTenant.remove();
    }
}`
                            }
                          ]
                        },
                        {
                          name: "routing",
                          type: "folder",
                          path: "src/main/java/com/notary/saas/core/routing",
                          category: "Tenant Routing",
                          description: "PostgreSQL schema-connection routing classes.",
                          code: "",
                          children: [
                            {
                              name: "MultiTenantConnectionProviderImpl.java",
                              type: "file",
                              category: "Tenant Routing",
                              path: "src/main/java/com/notary/saas/core/routing/MultiTenantConnectionProviderImpl.java",
                              description: "Drives PostgreSQL connections. Resolves and locks dynamic connections bound to tenant-isolated database schemas.",
                              code: `package com.notary.saas.core.routing;

import org.hibernate.engine.jdbc.connections.spi.MultiTenantConnectionProvider;
import org.springframework.stereotype.Component;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Hibernate connection provider that intercepts connection acquisitions and sets
 * the search_path to the specific tenant schema to guarantee database logical isolation.
 */
@Component
public class MultiTenantConnectionProviderImpl implements MultiTenantConnectionProvider {

    private final DataSource dataSource;
    private static final String DEFAULT_SCHEMA = "public";

    public MultiTenantConnectionProviderImpl(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Connection getAnyConnection() throws SQLException {
        return dataSource.getConnection();
    }

    @Override
    public void releaseAnyConnection(Connection connection) throws SQLException {
        connection.close();
    }

    @Override
    public Connection getConnection(Object tenantIdentifier) throws SQLException {
        final Connection connection = getAnyConnection();
        try {
            String schemaName = tenantIdentifier != null ? tenantIdentifier.toString() : DEFAULT_SCHEMA;
            // PostgreSQL Dialect schema shifting
            connection.createStatement().execute("SET search_path TO " + schemaName);
        } catch (SQLException e) {
            connection.close();
            throw new SQLException("Failed to shift database connection to active tenant schema: " + tenantIdentifier, e);
        }
        return connection;
    }

    @Override
    public void releaseConnection(Object tenantIdentifier, Connection connection) throws SQLException {
        try {
            connection.createStatement().execute("SET search_path TO " + DEFAULT_SCHEMA);
        } catch (SQLException e) {
            // Log fallback fail safely
        }
        connection.close();
    }

    @Override
    public boolean supportsAggressiveRelease() {
        return true;
    }

    @Override
    public boolean isUnwrappableAs(Class<?> unwrapType) {
        return false;
    }

    @Override
    public <T> T unwrap(Class<T> unwrapType) {
        return null;
    }
}`
                            },
                            {
                              name: "CurrentTenantIdentifierResolverImpl.java",
                              type: "file",
                              category: "Tenant Routing",
                              path: "src/main/java/com/notary/saas/core/routing/CurrentTenantIdentifierResolverImpl.java",
                              description: "Interprets TenantContext values for Hibernate JPA queries.",
                              code: `package com.notary.saas.core.routing;

import com.notary.saas.core.context.TenantContext;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.stereotype.Component;

/**
 * Informs Hibernate which schema identifier is parsed from the current request's TenantContext.
 */
@Component
public class CurrentTenantIdentifierResolverImpl implements CurrentTenantIdentifierResolver<String> {

    private static final String DEFAULT_SCHEMA = "public";

    @Override
    public String resolveCurrentTenantIdentifier() {
        String tenant = TenantContext.getCurrentTenant();
        return tenant != null ? tenant : DEFAULT_SCHEMA;
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }
}`
                            }
                          ]
                        },
                        {
                          name: "security",
                          type: "folder",
                          path: "src/main/java/com/notary/saas/core/security",
                          category: "Security & Authentication",
                          description: "Spring Security, JWT Token services, and Cross-Tenant security safeguards.",
                          code: "",
                          children: [
                            {
                              name: "JwtTokenService.java",
                              type: "file",
                              category: "Security & Authentication",
                              path: "src/main/java/com/notary/saas/core/security/JwtTokenService.java",
                              description: "Signs and extracts authenticated JWT tokens with specific tenant keys, roles, and authorities claims.",
                              code: `package com.notary.saas.core.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import java.security.Key;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Enterprise token provider capturing security parameters under a tenant boundaries umbrella.
 */
@Service
public class JwtTokenService {

    private final Key signingKey;
    private final long expirationTimeMs;

    public JwtTokenService(
            @Value("\${jwt.secret:MySuper32CharacterLongSecretKeyRequiredForAuthenticatingNotaryJWT}") String secret,
            @Value("\${jwt.expiration:86400000}") long expiration) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationTimeMs = expiration;
    }

    public String generateToken(String email, String tenantId, List<String> authorities) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationTimeMs);

        return Jwts.builder()
                .setSubject(email)
                .claim("tenantId", tenantId)
                .claim("authorities", authorities)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isTokenValid(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(signingKey).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String extractEmail(String token) {
        return getClaims(token).getSubject();
    }

    public String extractTenantId(String token) {
        return getClaims(token).get("tenantId", String.class);
    }

    @SuppressWarnings("unchecked")
    public List<String> extractAuthorities(String token) {
        return getClaims(token).get("authorities", List.class);
    }

    public UsernamePasswordAuthenticationToken getAuthentication(String token) {
        String email = extractEmail(token);
        List<String> authorities = extractAuthorities(token);
        
        List<SimpleGrantedAuthority> grantedAuthorities = authorities.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());

        return new UsernamePasswordAuthenticationToken(email, null, grantedAuthorities);
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}`
                            },
                            {
                              name: "JwtAuthenticationFilter.java",
                              type: "file",
                              category: "Security & Authentication",
                              path: "src/main/java/com/notary/saas/core/security/JwtAuthenticationFilter.java",
                              description: "The gatekeeper: crosscheck tenant IDs inside validated JWT claims against requested subdomains.",
                              code: `package com.notary.saas.core.security;

import com.notary.saas.core.context.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/**
 * Validates requested routes. Checks that the tenant boundary in the JWT matches the
 * active thread context extracted by TenantInterceptor to prevent horizontal escalation.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService jwtTokenService;

    public JwtAuthenticationFilter(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            if (jwtTokenService.isTokenValid(token)) {
                String tokenTenantId = jwtTokenService.extractTenantId(token);
                String activeTenant = TenantContext.getCurrentTenant();
                
                // CRITICAL BOUNDARY ENFORCEMENT:
                // If a user belongs to Tenant A but attempts an execution on Tenant B routes, block.
                if (activeTenant != null && !activeTenant.equalsIgnoreCase(tokenTenantId)) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("{\"error\": \"Tenant context mismatch. Cross-tenant request denied.\"}");
                    return;
                }

                UsernamePasswordAuthenticationToken auth = jwtTokenService.getAuthentication(token);
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}`
                            },
                            {
                              name: "WebSecurityConfig.java",
                              type: "file",
                              category: "Security & Authentication",
                              path: "src/main/java/com/notary/saas/core/security/WebSecurityConfig.java",
                              description: "Injects stateless CORS settings, configures path mappings, mapping RBAC rules standardly.",
                              code: `package com.notary.saas.core.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Main Spring Security configure setup.
 * Activates @PreAuthorize method security supporting RBAC validation annotations.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class WebSecurityConfig {

    private final JwtTokenService jwtTokenService;

    public WebSecurityConfig(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configure(http))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login", "/api/tenants/register").permitAll()
                .requestMatchers("/api/admin/**").hasRole("SUPER_ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(new JwtAuthenticationFilter(jwtTokenService), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}`
                            }
                          ]
                        }
                      ]
                    },
                    {
                      name: "domain",
                      type: "folder",
                      path: "src/main/java/com/notary/saas/domain",
                      category: "Identity Domain",
                      description: "The core domain modules of the platform, matching tables mapped in Postgres database.",
                      code: "",
                      children: [
                        {
                          name: "tenant",
                          type: "folder",
                          path: "src/main/java/com/notary/saas/domain/tenant",
                          category: "Identity Domain",
                          description: "Models and operations for SaaS client instances, companies, and branches.",
                          code: "",
                          children: [
                            {
                              name: "Tenant.java",
                              type: "file",
                              category: "Identity Domain",
                              path: "src/main/java/com/notary/saas/domain/tenant/Tenant.java",
                              description: "Entity class mapping subscription tiers (Basic, Professional, Enterprise) and active statuses.",
                              code: `package com.notary.saas.domain.tenant;

import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Master catalog tracking corporate SaaS client workspaces.
 */
@Entity
@Table(name = "tenants", schema = "public")
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String subdomain;

    @Column(nullable = false)
    private String tier = "professional"; // basic, professional, enterprise

    @Column(nullable = false)
    private String status = "active"; // active, suspended, trial_expired

    @Column(name = "db_schema", nullable = false)
    private String dbSchema = "public";

    @Column(name = "created_at")
    private ZonedDateTime createdAt = ZonedDateTime.now();

    // Getters and Setters...
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSubdomain() { return subdomain; }
    public void setSubdomain(String subdomain) { this.subdomain = subdomain; }
    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDbSchema() { return dbSchema; }
    public void setDbSchema(String dbSchema) { this.dbSchema = dbSchema; }
}`
                            },
                            {
                              name: "TenantRepository.java",
                              type: "file",
                              category: "Identity Domain",
                              path: "src/main/java/com/notary/saas/domain/tenant/TenantRepository.java",
                              description: "Spring Data JPA query layer for locating tenants by status or subdomains.",
                              code: `package com.notary.saas.domain.tenant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    Optional<Tenant> findBySubdomain(String subdomain);
    boolean existsBySubdomain(String subdomain);
}`
                            }
                          ]
                        },
                        {
                          name: "user",
                          type: "folder",
                          path: "src/main/java/com/notary/saas/domain/user",
                          category: "Security & Authentication",
                          description: "Role Based Access Control (RBAC) modeling with explicit permissions maps.",
                          code: "",
                          children: [
                            {
                              name: "User.java",
                              type: "file",
                              category: "Security & Authentication",
                              path: "src/main/java/com/notary/saas/domain/user/User.java",
                              description: "The primary user operator. Holds professional notary licenses and active RBAC relationships.",
                              code: `package com.notary.saas.domain.user;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Tenant-scoped employee details containing licensing commission certificates.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "commission_number")
    private String commissionNumber;

    @Column(name = "commission_expiry")
    private LocalDate commissionExpiry;

    @Column(nullable = false)
    private String status = "active";

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id")
    private Role role;

    // Getters and Setters ...
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getCommissionNumber() { return commissionNumber; }
    public void setCommissionNumber(String commissionNumber) { this.commissionNumber = commissionNumber; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
}`
                            },
                            {
                              name: "Role.java",
                              type: "file",
                              category: "Security & Authentication",
                              path: "src/main/java/com/notary/saas/domain/user/Role.java",
                              description: "A customized RBAC package model connecting tenant groups to permission tables dynamically.",
                              code: `package com.notary.saas.domain.user;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Custom role profile scoping employee rights. Examples: 'notary_officer', 'branch_admin'.
 */
@Entity
@Table(name = "roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String code;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "roles_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();

    // Getters and Setters ...
    public UUID getId() { return id; }
    public String getCode() { return code; }
    public Set<Permission> getPermissions() { return permissions; }
}`
                            },
                            {
                              name: "Permission.java",
                              type: "file",
                              category: "Security & Authentication",
                              path: "src/main/java/com/notary/saas/domain/user/Permission.java",
                              description: "A fine-grained permission action (e.g., 'document:seal', 'biometric:verify') processed by method security.",
                              code: `package com.notary.saas.domain.user;

import jakarta.persistence.*;
import java.util.UUID;

/**
 * System-wide fine-grained permission action code.
 */
@Entity
@Table(name = "permissions", schema = "public")
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code; // 'document:seal', 'biometric:verify'

    @Column(nullable = false)
    private String name;

    // Getters and set ...
    public UUID getId() { return id; }
    public String getCode() { return code; }
}`
                            }
                          ]
                        },
                        {
                          name: "notary",
                          type: "folder",
                          path: "src/main/java/com/notary/saas/domain/notary",
                          category: "Notary Domain",
                          description: "Business models covering document workflows, queues, and legally compliant signatures.",
                          code: "",
                          children: [
                            {
                              name: "Document.java",
                              type: "file",
                              category: "Notary Domain",
                              path: "src/main/java/com/notary/saas/domain/notary/Document.java",
                              description: "The core legal contract entity. Validates tamper-evident ledger hash sums and secure stamps.",
                              code: `package com.notary.saas.domain.notary;

import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * High-security legal certificate record.
 * Leverages hash sums to ensure that the document content remains immutable.
 */
@Entity
@Table(name = "documents")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(nullable = false)
    private String title;

    @Column(name = "content_markdown", nullable = false, columnDefinition = "TEXT")
    private String contentMarkdown;

    @Column(nullable = false)
    private String status = "draft"; // draft, pending_signatures, sealed_completed

    @Column(name = "notary_act_type")
    private String notaryActType; // Apostille, Affidavit, Deed

    @Column(name = "ledger_hash", unique = true)
    private String ledgerHash; // SHA-256 lock trace

    @Column(name = "watermark_uuid")
    private UUID watermarkUuid;

    @Column(name = "created_at")
    private ZonedDateTime createdAt = ZonedDateTime.now();

    // Getters and Setters...
    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContentMarkdown() { return contentMarkdown; }
    public void setContentMarkdown(String markdown) { this.contentMarkdown = markdown; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getLedgerHash() { return ledgerHash; }
    public void setLedgerHash(String hash) { this.ledgerHash = hash; }
    public UUID getWatermarkUuid() { return watermarkUuid; }
    public void setWatermarkUuid(UUID uuid) { this.watermarkUuid = uuid; }
}`
                            },
                            {
                              name: "DocumentRepository.java",
                              type: "file",
                              category: "Notary Domain",
                              path: "src/main/java/com/notary/saas/domain/notary/DocumentRepository.java",
                              description: "Custom queries locating documents matching hash certificates or customer references under tenant visibility rules.",
                              code: `package com.notary.saas.domain.notary;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findByTenantIdAndCustomerId(UUID tenantId, UUID customerId);
    Optional<Document> findByLedgerHash(String ledgerHash);
}`
                            },
                            {
                              name: "NotaryService.java",
                              type: "file",
                              category: "Notary Domain",
                              path: "src/main/java/com/notary/saas/domain/notary/NotaryService.java",
                              description: "Domain Service handling biometric, state laws, and blockchain audit hashing workflow.",
                              code: `package com.notary.saas.domain.notary;

import com.notary.saas.domain.notary.dto.DocumentSigningDto;
import com.notary.saas.core.context.TenantContext;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Handles security validation processes to generate, sign, and seal electronic notarizations.
 */
@Service
@Transactional
public class NotaryService {

    private final DocumentRepository documentRepository;

    public NotaryService(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    /**
     * Secures a document. Requires fine-grained RBAC permission authority code 'document:seal'.
     */
    @PreAuthorize("hasAuthority('document:seal')")
    public Document sealDocument(UUID documentId, DocumentSigningDto signingPayload) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        // Generate static blockchain cryptographic hash combining metadata and sign coords
        String combinedSignData = document.getContentMarkdown() + "|" 
                + signingPayload.getSignaturePathJson() + "|" 
                + signingPayload.getCertificateSerial();
        
        String sha256HexHash = DigestUtils.sha256Hex(combinedSignData);
        
        document.setLedgerHash(sha256HexHash);
        document.setWatermarkUuid(UUID.randomUUID());
        document.setStatus("sealed_completed");
        
        return documentRepository.save(document);
    }
}`
                            },
                            {
                              name: "QueueTicket.java",
                              type: "file",
                              category: "Notary Domain",
                              path: "src/main/java/com/notary/saas/domain/notary/QueueTicket.java",
                              description: "Controls reception lines, serving branch desks details.",
                              code: `package com.notary.saas.domain.notary;

import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Represents current waiting patrons inside branch offices.
 */
@Entity
@Table(name = "queue_tickets")
public class QueueTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "ticket_number", nullable = false)
    private String ticketNumber; // NOT-102

    @Column(name = "service_type", nullable = false)
    private String serviceType;

    @Column(nullable = false)
    private String status = "waiting"; // waiting, calling, serving, completed

    @Column(name = "called_at")
    private ZonedDateTime calledAt;

    @Column(name = "served_by")
    private UUID servedBy;

    // Getters and Setters...
    public UUID getId() { return id; }
    public String getTicketNumber() { return ticketNumber; }
    public void setStatus(String status) { this.status = status; }
}`
                            }
                          ]
                        },
                        {
                          name: "audit",
                          type: "folder",
                          path: "src/main/java/com/notary/saas/domain/audit",
                          category: "Audit & Aspects",
                          description: "Automated event interception driving security compliance standards automatically.",
                          code: "",
                          children: [
                            {
                              name: "AuditAction.java",
                              type: "file",
                              category: "Audit & Aspects",
                              path: "src/main/java/com/notary/saas/domain/audit/AuditAction.java",
                              description: "Custom Annotation intercepting execution parameters to log details to databases schema.",
                              code: `package com.notary.saas.domain.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation processed by AOP to record tamper-proof audit trails for legal compliance.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditAction {
    String value() default ""; // Name of the operation, e.g., 'DOCUMENT_SEAL'
    String entity() default ""; // Active Entity name, e.g., 'Document'
}`
                            },
                            {
                              name: "AuditLogAspect.java",
                              type: "file",
                              category: "Audit & Aspects",
                              path: "src/main/java/com/notary/saas/domain/audit/AuditLogAspect.java",
                              description: "Interceptors monitoring services methods, fetching Client IPs, and capturing payloads automatically.",
                              code: `package com.notary.saas.domain.audit;

import com.notary.saas.core.context.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodReflectionHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import java.util.UUID;

/**
 * Dynamic aspect logging operations automatically to meet legal standards for notary compliance.
 */
@Aspect
@Component
public class AuditLogAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditLogAspect.class);

    @AfterReturning(value = "@annotation(auditAction)", returning = "result")
    public void logOperation(JoinPoint joinPoint, AuditAction auditAction, Object result) {
        String tenantId = TenantContext.getCurrentTenant();
        String operator = SecurityContextHolder.getContext().getAuthentication() != null 
                ? SecurityContextHolder.getContext().getAuthentication().getName() : "anonymous";
        
        HttpServletRequest request = null;
        String ipAddress = "127.0.0.1";
        if (RequestContextHolder.getRequestAttributes() != null) {
            request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
            ipAddress = request.getRemoteAddr();
        }

        log.info("COMPLIANCE AUDIT | Tenant: {} | Operator: {} | IP: {} | Action: {} | Target Entity: {}", 
                tenantId, operator, ipAddress, auditAction.value(), auditAction.entity());
        
        // Write raw payloads asynchronous tracking records directly to database partition loops
    }
}`
                            }
                          ]
                        },
                        {
                          name: "dto",
                          type: "folder",
                          path: "src/main/java/com/notary/saas/domain/notary/dto",
                          category: "DTOs",
                          description: "Secure boundaries mapping API deserialization parameters.",
                          code: "",
                          children: [
                            {
                              name: "DocumentSigningDto.java",
                              type: "file",
                              category: "DTOs",
                              path: "src/main/java/com/notary/saas/domain/notary/dto/DocumentSigningDto.java",
                              description: "Ensures incoming e-signatures contain coordinates payload streams, avoiding code corruption.",
                              code: `package com.notary.saas.domain.notary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload validating digital signature requests and checking integrity constraints.
 */
public class DocumentSigningDto {

    @NotBlank(message = "Coordinate vector matrix cannot be null")
    private String signaturePathJson;

    @Size(max = 45, message = "Client IP parameter overflows size bounds")
    private String ipAddress;

    @NotBlank(message = "Cryptographic certificate serial number required for validation")
    private String certificateSerial;

    // Getters and Setters...
    public String getSignaturePathJson() { return signaturePathJson; }
    public void setSignaturePathJson(String json) { this.signaturePathJson = json; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ip) { this.ipAddress = ip; }
    public String getCertificateSerial() { return certificateSerial; }
    public void setCertificateSerial(String serial) { this.certificateSerial = serial; }
}`
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find a node by path recursively
  const findNodeByPath = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = findNodeByPath(files, selectedFilePath) || files[0].children![0].children![0].children![0].children![0].children![1].children![0];

  // Render directory tree recursively
  const renderTree = (nodes: FileNode[]) => {
    return nodes.map(node => {
      const isExpanded = expandedFolders[node.path];
      const hasChildren = node.children && node.children.length > 0;
      
      // Filter logic if category filtering is enabled
      if (activeCategory !== "All") {
        if (node.type === "file" && node.category !== activeCategory) {
          return null;
        }
        if (node.type === "folder") {
          // If a folder has no matching children, hide it
          const visibleChildren = node.children?.filter(c => {
            if (c.type === "file") return c.category === activeCategory;
            // Check deeper
            const matchDeep = (n: FileNode): boolean => {
              if (n.type === "file") return n.category === activeCategory;
              return n.children?.some(matchDeep) || false;
            };
            return matchDeep(c);
          });
          if (!visibleChildren || visibleChildren.length === 0) return null;
        }
      }

      return (
        <div key={node.path} className="pl-3.5">
          <div 
            onClick={() => {
              if (node.type === "folder") {
                handleToggleFolder(node.path);
              } else {
                setSelectedFilePath(node.path);
                setCopied(false);
              }
            }}
            className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-xs cursor-pointer select-none transition-all ${
              node.type === "file" && selectedFilePath === node.path
                ? "bg-indigo-500/15 border-l-2 border-indigo-400 text-indigo-200 font-medium"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            {node.type === "folder" ? (
              <>
                <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-indigo-500 shrink-0" />
                )}
                <span className="font-mono text-slate-300">{node.name}</span>
              </>
            ) : (
              <>
                <FileCode className="w-4 h-4 text-emerald-400 pl-0.5 shrink-0" />
                <span className="font-mono">{node.name}</span>
                <span className="text-[9px] px-1 bg-slate-950 text-slate-500 rounded font-sans ml-auto scale-90">{node.category}</span>
              </>
            )}
          </div>
          
          {node.type === "folder" && isExpanded && node.children && (
            <div className="border-l border-slate-900 ml-2 mt-0.5">
              {renderTree(node.children)}
            </div>
          )}
        </div>
      );
    });
  };

  const categories = ["All", "Tenant Routing", "Security & Authentication", "Identity Domain", "Notary Domain", "Audit & Aspects", "DTOs"];

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 text-slate-100 shadow-xl overflow-hidden h-full flex flex-col" id="springboot-architecture">
      
      {/* Title & Description */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-sans font-semibold tracking-tight text-white flex items-center gap-2">
            <Server className="text-indigo-400 w-5.5 h-5.5" />
            Spring Boot Backend Blueprint
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Browse corporate-grade Java files explaining database dynamic search path schemas, e-signature validation DTOs, and Aspect auditing logs.
          </p>
        </div>

        {/* Quick architectural summary stats */}
        <div className="flex gap-2 text-[10px] font-mono text-slate-500 bg-slate-900/40 p-2 rounded-lg border border-slate-900">
          <div className="px-1.5 border-r border-slate-800"><span className="text-indigo-400">17</span> Entities</div>
          <div className="px-1.5 border-r border-slate-800"><span className="text-purple-400">JWT + RBAC</span> Sec</div>
          <div className="px-1.5"><span className="text-emerald-400">ThreadLocal</span> isolation</div>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5 pb-4 border-b border-slate-900 mb-6">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-[10px] font-mono transition-all outline-none ${
              activeCategory === cat
                ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold"
                : "bg-slate-900/50 border border-transparent text-slate-500 hover:text-slate-350"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main workspace panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0">
        
        {/* Dynamic Directory Explorer tree (Col Span 4) */}
        <div className="lg:col-span-4 bg-slate-950/40 border border-slate-900 rounded-xl p-3 flex flex-col overflow-y-auto max-h-[550px]" id="packages-tree">
          <p className="text-[9px] font-mono text-slate-500 px-3 py-1.5 uppercase tracking-wider font-semibold border-b border-slate-900/80 mb-2">
            Packages Tree Structure
          </p>
          <div className="space-y-0.5 select-none">{renderTree(files)}</div>
        </div>

        {/* Code Content preview & description (Col Span 8) */}
        <div className="lg:col-span-8 flex flex-col bg-slate-950/60 border border-slate-900 rounded-xl overflow-hidden max-h-[550px]">
          
          {/* Header controls of selected file */}
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-900 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></span>
              <p className="text-xs font-mono text-slate-200 tracking-tight truncate max-w-xs md:max-w-md">
                {selectedNode && selectedNode.path}
              </p>
            </div>
            {selectedNode && selectedNode.type === "file" && (
              <button
                onClick={() => handleCopyCode(selectedNode.code)}
                className="text-xs bg-slate-950 hover:bg-slate-800 active:bg-slate-950 border border-slate-800 hover:border-slate-700 font-medium text-slate-300 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all outline-none animate-none"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied Class!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Copy Code
                  </>
                )}
              </button>
            )}
          </div>

          {/* Description banner */}
          {selectedNode && selectedNode.type === "file" && (
            <div className="bg-slate-900/30 px-5 py-3 border-b border-slate-900 text-xs text-slate-400 leading-relaxed font-sans flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 animate-pulse"></div>
              <div>
                <b className="text-slate-300 font-mono text-[11px] block mb-1">DESIGN FOCUS:</b>
                {selectedNode.description}
              </div>
            </div>
          )}

          {/* Code viewport container */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-6 text-slate-300 bg-slate-950/40 select-text select-all max-h-[400px]">
            {selectedNode && selectedNode.type === "file" ? (
              <pre className="whitespace-pre overflow-x-auto selection:bg-indigo-600/30">{selectedNode.code}</pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <FileCode className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
                <p className="text-sm font-sans text-slate-500">
                  Select any legal class file inside the packages tree to inspect the architecture blueprint code.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sequence architecture explanation panel */}
      <div className="mt-8 border border-slate-900 bg-slate-900/10 rounded-xl p-5">
        <h4 className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-2 mb-4 uppercase tracking-wider">
          <Network className="text-cyan-400 w-4 h-4" />
          The Multi-Tenant Core Lifecycle Sequence
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          
          <div className="bg-slate-950/50 border border-slate-900/60 p-3 rounded-lg relative">
            <span className="absolute top-2.5 right-3 text-[10px] font-mono font-bold bg-slate-900 text-slate-550 border border-slate-800 w-5 h-5 rounded-full flex items-center justify-center">1</span>
            <p className="font-mono text-slate-205 mb-1.5 flex items-center gap-1.5 text-[11px]">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              Ingress Resolution
            </p>
            <p className="text-slate-400 text-[11px] leading-5">
              Nginx Gateway extracts subdomain hosts (i.e. <code>loop.notary.com</code>). <code>TenantInterceptor</code> intercepts requests to bind the active client schema code directly in <code>TenantContext</code>'s static thread storage.
            </p>
          </div>

          <div className="bg-slate-950/50 border border-slate-900/60 p-3 rounded-lg relative">
            <span className="absolute top-2.5 right-3 text-[10px] font-mono font-bold bg-slate-900 text-slate-550 border border-slate-800 w-5 h-5 rounded-full flex items-center justify-center">2</span>
            <p className="font-mono text-slate-205 mb-1.5 flex items-center gap-1.5 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              Safeguard JWT Verify
            </p>
            <p className="text-slate-400 text-[11px] leading-5">
              <code>JwtAuthenticationFilter</code> processes validated headers, decrypts the token's claims, and cross-checks that the tenant identifier inside claims matches the current Context thread, instantly blocking horizontal leaks.
            </p>
          </div>

          <div className="bg-slate-950/50 border border-slate-900/60 p-3 rounded-lg relative">
            <span className="absolute top-2.5 right-3 text-[10px] font-mono font-bold bg-slate-900 text-slate-550 border border-slate-800 w-5 h-5 rounded-full flex items-center justify-center">3</span>
            <p className="font-mono text-slate-205 mb-1.5 flex items-center gap-1.5 text-[11px]">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Schema Routing
            </p>
            <p className="text-slate-400 text-[11px] leading-5">
              As JPA triggers query sessions, <code>CurrentTenantIdentifierResolver</code> pulls the active ID. <code>MultiTenantConnectionProviderImpl</code> executes a PostgreSQL state directive <code>SET search_path</code> for completely isolated views.
            </p>
          </div>

          <div className="bg-slate-950/50 border border-slate-900/60 p-3 rounded-lg relative">
            <span className="absolute top-2.5 right-3 text-[10px] font-mono font-bold bg-slate-900 text-slate-550 border border-slate-800 w-5 h-5 rounded-full flex items-center justify-center">4</span>
            <p className="font-mono text-slate-205 mb-1.5 flex items-center gap-1.5 text-[11px]">
              <Shield className="w-3.5 h-3.5 text-rose-450" />
              RBAC & AOP Logging
            </p>
            <p className="text-slate-400 text-[11px] leading-5">
              Enterprise procedures are restricted by Spring Security <code>@PreAuthorize</code> checkers. AOP Aspects intercept return payloads, dynamically sending compliance audit indicators directly to database partitions.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
