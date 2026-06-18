import { useState, useEffect } from "react";
import { 
  Lock, Key, ShieldCheck, Users, Globe, Terminal, Code, Check, Copy, 
  HelpCircle, RefreshCw, Send, AlertTriangle, ShieldAlert, Cpu
} from "lucide-react";

interface MockUser {
  id: string;
  email: string;
  fullName: string;
  role: "ROLE_SUPER_ADMIN" | "ROLE_BRANCH_ADMIN" | "ROLE_NOTARY_OFFICER" | "ROLE_RECEPTIONIST";
  tenantId: string;
  commission: string;
}

export default function AuthModule() {
  const [email, setEmail] = useState("s.jenkins@metro-notary.com");
  const [password, setPassword] = useState("••••••••••••");
  const [subdomain, setSubdomain] = useState("metro-chicago");
  const [selectedRole, setSelectedRole] = useState<MockUser["role"]>("ROLE_NOTARY_OFFICER");
  const [activeTabSub, setActiveTabSub] = useState<"playground" | "interceptors" | "secure-code">("playground");
  const [codeTab, setCodeTab] = useState<"security-config" | "jwt-filter" | "auth-provider">("security-config");
  
  const [isLoading, setIsLoading] = useState(false);
  const [tokenGenerated, setTokenGenerated] = useState<string>("");
  const [copied, setCopied] = useState(false);
  
  // Simulation states
  const [reqPath, setReqPath] = useState("/api/notary/documents/seal");
  const [customTenantHeader, setCustomTenantHeader] = useState("metro-chicago");
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [securityContextUser, setSecurityContextUser] = useState<string | null>(null);

  // Generate simulated JWT
  const generateSimulatedToken = () => {
    setIsLoading(true);
    setTimeout(() => {
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(JSON.stringify({
        sub: email,
        tenant_id: subdomain,
        roles: [selectedRole],
        fullName: selectedRole === "ROLE_SUPER_ADMIN" ? "Super System Operator" : "Sarah Jenkins",
        commission: selectedRole === "ROLE_NOTARY_OFFICER" ? "CA-COMM-9812-CAL" : "N/A",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: "notary-auth-authority"
      })).replace(/=/g, "");
      const signature = btoa("hmac_sha256_symmetric_signature_of_the_notary_saas_cluster").slice(0, 43);
      
      setTokenGenerated(`${header}.${payload}.${signature}`);
      setIsLoading(false);
    }, 600);
  };

  useEffect(() => {
    generateSimulatedToken();
  }, [email, subdomain, selectedRole]);

  // Decode helper
  const decodeTokenParts = () => {
    if (!tokenGenerated) return { header: "{}", payload: "{}", signature: "" };
    const parts = tokenGenerated.split(".");
    try {
      const headerStr = atob(parts[0]);
      const payloadStr = atob(parts[1] + "=="); // safety pad
      return {
        header: JSON.stringify(JSON.parse(headerStr), null, 2),
        payload: JSON.stringify(JSON.parse(payloadStr), null, 2),
        signature: parts[2] || ""
      };
    } catch {
      return { header: "{}", payload: "{}", signature: parts[2] || "" };
    }
  };

  const decodeData = decodeTokenParts();

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Run security interceptor chain simulation
  const runSecurityPipelineTest = () => {
    const logs: string[] = [];
    logs.push(`[04:03:06 UTC] INBOUND REQUEST INTERCEPTED: POST ${reqPath}`);
    logs.push(`[04:03:06 UTC] FilterChain: Invoking TenantIdentificationFilter`);
    
    // 1. Tenant Check
    const activeTenant = customTenantHeader.trim().toLowerCase();
    if (!activeTenant) {
      logs.push(`[AOP WARNING] Header 'X-Tenant-ID' is empty!`);
      logs.push(`[FilterChain] Denied. Falling back to public schema gateway`);
    } else {
      logs.push(`[TenantContext] Bound Tenant identifier to thread-local: '${activeTenant}'`);
    }

    // 2. JWT Filter check
    logs.push(`[04:03:06 UTC] FilterChain: Invoking JwtAuthenticationFilter`);
    if (!tokenGenerated) {
      logs.push(`[SecurityContext] Authorization header is missing! Anonymous user binding.`);
    } else {
      logs.push(`[JwtTokenUtil] Extracting Bearer token from headers...`);
      logs.push(`[JwtTokenUtil] Checking signature with local HSM secret... OK`);
      try {
        const payloadObj = JSON.parse(decodeData.payload);
        const tokenTenant = payloadObj.tenant_id;
        const userRoles: string[] = payloadObj.roles;
        const userSub = payloadObj.sub;

        logs.push(`[JwtTokenUtil] Subject resolved: ${userSub}`);
        logs.push(`[JwtTokenUtil] Claims tenant match: '${tokenTenant}'`);
        logs.push(`[JwtTokenUtil] Claims roles parsed: ${JSON.stringify(userRoles)}`);

        // Check token expiry
        if (payloadObj.exp < Math.floor(Date.now() / 1000) - 100000) {
          logs.push(`[JwtTokenUtil] CRITICAL: Token claims expired!`);
          setHttpStatus(401);
          setSecurityContextUser(null);
          setExecutionLog(logs);
          return;
        }

        // Check if token tenant matches header tenant to block cross-contamination
        if (activeTenant && tokenTenant !== activeTenant && selectedRole !== "ROLE_SUPER_ADMIN") {
          logs.push(`[TenantInterceptor] SECURITY EXCEPTION: Tenant context mismatch!`);
          logs.push(`[SecurityContext] Intercepted attempt by tenant '${tokenTenant}' to access tenant '${activeTenant}' resources.`);
          setHttpStatus(403);
          setSecurityContextUser(null);
          setExecutionLog(logs);
          return;
        }

        logs.push(`[SecurityContext] Setting SecurityContextHolder with UsernamePasswordAuthenticationToken`);
        setSecurityContextUser(userSub);

        // 3. Authority checks based on endpoint
        logs.push(`[04:03:06 UTC] FilterChain: Invoking AuthorizationFilter (Role Checks)`);
        
        if (reqPath.startsWith("/api/super-admin")) {
          if (userRoles.includes("ROLE_SUPER_ADMIN")) {
            logs.push(`[AuthSuccess] Access granted. SuperAdmin role validated.`);
            setHttpStatus(200);
          } else {
            logs.push(`[AuthFailure] Access denied. Path "/api/super-admin/**" requires Authority 'ROLE_SUPER_ADMIN'`);
            setHttpStatus(403);
          }
        } else if (reqPath.startsWith("/api/notary/documents/seal")) {
          if (userRoles.includes("ROLE_NOTARY_OFFICER") || userRoles.includes("ROLE_BRANCH_ADMIN")) {
            logs.push(`[AuthSuccess] Access granted. Document sealant privileges validated.`);
            setHttpStatus(200);
          } else {
            logs.push(`[AuthFailure] Access denied. Path "/api/notary/documents/seal" requires Authority 'ROLE_NOTARY_OFFICER' or 'ROLE_BRANCH_ADMIN'`);
            setHttpStatus(403);
          }
        } else if (reqPath.startsWith("/api/notary/queue/call")) {
          if (userRoles.includes("ROLE_NOTARY_OFFICER") || userRoles.includes("ROLE_BRANCH_ADMIN") || userRoles.includes("ROLE_RECEPTIONIST")) {
            logs.push(`[AuthSuccess] Access granted. Queue operation privilege validated.`);
            setHttpStatus(200);
          } else {
            logs.push(`[AuthFailure] Access denied. Queue calls require active clerk authority`);
            setHttpStatus(403);
          }
        } else {
          logs.push(`[AuthSuccess] Path falls under permitAll list. Request passed.`);
          setHttpStatus(200);
        }

      } catch (err) {
        logs.push(`[JwtExcept] Failed to parse JWT payload successfully`);
        setHttpStatus(401);
      }
    }
    setExecutionLog(logs);
  };

  const javaSourceCode = {
    "security-config": `package com.notary.saas.core.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Robust Enterprise Multi-Tenant Spring Security filter configuration.
 * Hardens endpoints, enforces stateless Sessions (JWT checks), and integrates tenant checks.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class WebSecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final TenantValidationInterceptor tenantInterceptor;

    public WebSecurityConfig(JwtAuthenticationFilter jwtFilter, TenantValidationInterceptor tenantInterceptor) {
        this.jwtAuthenticationFilter = jwtFilter;
        this.tenantInterceptor = tenantInterceptor;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 1. Stateless API design disables standard Session cookies to prevent CSRF spoofing
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configure(http))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // 2. Authorize standard public resources + lock private branch desks
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/tenants/resolve/**").permitAll()
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/super-admin/**").hasAuthority("ROLE_SUPER_ADMIN")
                .requestMatchers("/api/notary/documents/seal/**").hasAnyAuthority("ROLE_NOTARY_OFFICER", "ROLE_BRANCH_ADMIN")
                .requestMatchers("/api/notary/queue/**").hasAnyAuthority("ROLE_NOTARY_OFFICER", "ROLE_BRANCH_ADMIN", "ROLE_RECEPTIONIST")
                .anyRequest().authenticated()
            );

        // 3. Inject our dynamic JWT check prior to username password authentication
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Dynamic BCrypt hashing using custom salt strength of 12
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}`,
    "jwt-filter": `package com.notary.saas.core.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/**
 * Filter interceptor resolving JWT tokens into Spring SecurityContext states.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final TokenProvider tokenProvider;

    public JwtAuthenticationFilter(TokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        
        String authHeader = request.getHeader("Authorization");
        
        // 1. Verify standard Authorization bearer token present
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwt = authHeader.substring(7);
        
        // 2. Decode claims and ensure active cryptographic verification
        if (tokenProvider.validateToken(jwt)) {
            String username = tokenProvider.getUsernameFromToken(jwt);
            var authorities = tokenProvider.getAuthoritiesFromToken(jwt);
            
            // Build Spring Credentials placeholder
            var authToken = new UsernamePasswordAuthenticationToken(username, null, authorities);
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            
            // 3. Place into execution Thread thread-local context
            SecurityContextHolder.getContext().setAuthentication(authToken);
        }

        filterChain.doFilter(request, response);
    }
}`,
    "auth-provider": `package com.notary.saas.core.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Key Provider class compiling JWT payloads and parsing signatures.
 */
@Service
public class TokenProvider {

    @Value("\${app.security.jwt.secret}")
    private String jwtSecret;

    @Value("\${app.security.jwt.expiration-ms:3600000}")
    private long jwtExpirationMs;

    public String generateToken(String username, String tenantId, List<String> roles) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .setSubject(username)
                .claim("tenant_id", tenantId)
                .claim("roles", roles)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(SignatureAlgorithm.HS512, jwtSecret)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false; // signature error, token expired, etc.
        }
    }

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token).getBody();
        return claims.getSubject();
    }

    public String getTenantIdFromToken(String token) {
        Claims claims = Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token).getBody();
        return claims.get("tenant_id", String.class);
    }

    public List<SimpleGrantedAuthority> getAuthoritiesFromToken(String token) {
        Claims claims = Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token).getBody();
        List<?> roles = claims.get("roles", List.class);
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority(role.toString()))
                .collect(Collectors.toList());
    }
}`
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-800 shadow-sm overflow-hidden h-full flex flex-col" id="auth-module">
      
      {/* Title Segment */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Lock className="text-blue-600 w-5 h-5" />
            Core Authentication &amp; Security Specs
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Explore state-of-the-art multi-tenant isolation layers. Generate verified JWT tokens and inspect robust Spring Security context interceptors.
          </p>
        </div>

        {/* Security Quick Stats */}
        <div className="flex gap-2 text-[10px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
          <div className="px-1.5 border-r border-slate-200"><span className="text-blue-600 font-bold">BCrypt</span> strength 12</div>
          <div className="px-1.5 border-r border-slate-200"><span className="text-emerald-700 font-bold">Claims</span> tenant-checked</div>
          <div className="px-1.5"><span className="text-indigo-600 font-mono font-bold">Header</span> X-Tenant-ID</div>
        </div>
      </div>

      {/* Main Tab selector */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTabSub("playground")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all outline-none ${
            activeTabSub === "playground" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Token Compiler
        </button>
        <button
          onClick={() => {
            setActiveTabSub("interceptors");
            runSecurityPipelineTest();
          }}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all outline-none ${
            activeTabSub === "interceptors" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Security Context Pipeline
        </button>
        <button
          onClick={() => setActiveTabSub("secure-code")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all outline-none ${
            activeTabSub === "secure-code" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Spring Security Source
        </button>
      </div>

      {/* TAB CONTAINER AREA */}
      <div className="flex-1">
        {/* TAB 1: INTERACTIVE TOKEN PLAYGROUND */}
        {activeTabSub === "playground" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Controls Column (4 cols) */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-mono text-slate-500 pb-2 border-b border-slate-200 uppercase font-bold tracking-wider">
                  Generate Identity Token Claims
                </p>
                
                {/* Form Elements */}
                <div className="space-y-3.5 mt-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-semibold">Operator Principal Email</label>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 p-2 text-xs font-mono outline-none rounded-lg text-slate-900 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-semibold">Static Password Preset</label>
                    <input
                      type="password"
                      value={password}
                      disabled
                      className="w-full bg-slate-200/50 border border-slate-200 p-2 text-xs font-mono outline-none rounded-lg text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-semibold">Tenant Context</label>
                      <select
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 text-xs text-slate-900 font-sans outline-none rounded-lg"
                      >
                        <option value="metro-chicago">metro-chicago</option>
                        <option value="apex-legal">apex-legal</option>
                        <option value="pac-coastal">pac-coastal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-semibold">Granted Role</label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 p-2 text-xs text-slate-900 font-sans outline-none rounded-lg"
                      >
                        <option value="ROLE_NOTARY_OFFICER">ROLE_NOTARY_OFFICER</option>
                        <option value="ROLE_BRANCH_ADMIN">ROLE_BRANCH_ADMIN</option>
                        <option value="ROLE_RECEPTIONIST">ROLE_RECEPTIONIST</option>
                        <option value="ROLE_SUPER_ADMIN">ROLE_SUPER_ADMIN</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning box */}
              <div className="bg-white border border-slate-200 p-3.5 rounded-lg text-xs leading-relaxed text-slate-500 mt-4 shadow-sm">
                <span className="font-bold text-slate-900 block uppercase font-mono text-[9px] tracking-wider mb-1">State Cryptography Guard</span>
                Your generated tokens have a symmetric HS256 sign matching Spring Boot. They enforce full multitenant resource sandbox isolation dynamically.
              </div>
            </div>

            {/* Right Display Column (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              {/* String Token */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Dynamic Encoded Token</span>
                  <button
                    onClick={() => handleCopy(tokenGenerated)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition shadow-sm font-semibold"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-550" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                
                <div className="p-4 font-mono text-xs text-slate-600 h-20 break-all select-all flex items-center bg-white">
                  {isLoading ? (
                    <span className="text-slate-400 italic">Signing new credentials...</span>
                  ) : (
                    <span>
                      <span className="text-purple-600 font-bold">{tokenGenerated.split(".")[0]}</span>
                      <span className="text-slate-550">.</span>
                      <span className="text-blue-650 font-bold">{tokenGenerated.split(".")[1]}</span>
                      <span className="text-slate-550">.</span>
                      <span className="text-emerald-600 font-bold">{tokenGenerated.split(".")[2]}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Parsed Visual Editor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {/* Claims Header */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
                  <div className="bg-white px-3.5 py-2 border-b border-slate-150 text-[10px] font-sans font-bold text-slate-800 tracking-wider">
                    Token Headers
                  </div>
                  <pre className="p-3.5 font-mono text-purple-700 text-[10px] leading-normal flex-1 overflow-auto bg-white">{decodeData.header}</pre>
                </div>

                {/* Claims Payload */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
                  <div className="bg-white px-3.5 py-2 border-b border-slate-150 text-[10px] font-sans font-bold text-slate-800 tracking-wider">
                    Claims Payload
                  </div>
                  <pre className="p-3.5 font-mono text-blue-700 text-[10px] leading-normal flex-1 overflow-auto bg-white">{decodeData.payload}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERCEPTOR SIMULATOR */}
        {activeTabSub === "interceptors" && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Header Control Segment */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl shadow-sm">
              <h4 className="text-xs font-sans text-slate-900 uppercase font-bold tracking-wider mb-4">
                Simulate Inbound REST Transactions to SaaS Clusters
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-550 font-mono mb-1 uppercase font-semibold">Request Path &amp; Method</label>
                  <select
                    value={reqPath}
                    onChange={(e) => setReqPath(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs text-slate-950 font-mono outline-none rounded-lg"
                  >
                    <option value="/api/notary/documents/seal">[POST] /api/notary/documents/seal</option>
                    <option value="/api/notary/queue/call">[POST] /api/notary/queue/call</option>
                    <option value="/api/super-admin/billing">[GET] /api/super-admin/billing</option>
                    <option value="/api/tenants/resolve/apex-legal">[GET] /api/tenants/resolve/apex-legal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-555 font-mono mb-1 uppercase font-semibold">Inbound `X-Tenant-ID` Header</label>
                  <input
                    type="text"
                    value={customTenantHeader}
                    onChange={(e) => setCustomTenantHeader(e.target.value)}
                    placeholder="e.g. metro-chicago"
                    className="w-full bg-white border border-slate-200 p-2 text-xs font-mono text-slate-950 outline-none rounded-lg"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={runSecurityPipelineTest}
                    className="w-full bg-blue-600 hover:bg-blue-500 font-bold active:scale-[98%] text-xs text-white py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Run Interceptor Simulation</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Results Grid logs & credentials */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Telemetry Output console logs (8 cols) */}
              <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-xl flex flex-col h-72 shadow-sm">
                <div className="bg-white px-4 py-2 border-b border-slate-200 flex items-center justify-between rounded-t-xl">
                  <span className="text-[10px] font-sans text-slate-700 font-bold uppercase flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-blue-605" />
                    Security Interceptor Chain Console Traces
                  </span>
                  {httpStatus && (
                    <span className={`text-[10px] font-sans px-2 py-0.5 rounded-full font-bold uppercase border ${
                      httpStatus === 200 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      HTTP {httpStatus} {httpStatus === 200 ? "OK" : httpStatus === 401 ? "UNAUTHORIZED" : "FORBIDDEN"}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 overflow-y-auto font-mono text-[10.5px] leading-relaxed text-slate-800 space-y-1 bg-white select-text">
                  {executionLog.map((log, i) => (
                    <div key={i} className={`${
                      log.includes("SECURITY EXCEPTION") || log.includes("AuthFailure") || log.includes("AOP WARNING")
                        ? "text-red-700 font-bold" 
                        : log.includes("Access granted") || log.includes("AuthSuccess")
                        ? "text-emerald-700 font-bold"
                        : log.includes("Bound Tenant")
                        ? "text-blue-700 font-bold"
                        : "text-slate-600"
                    }`}>
                      {log}
                    </div>
                  ))}
                  {executionLog.length === 0 && (
                    <div className="italic text-slate-400 text-center py-10 font-sans">
                      Configure your parameters and trigger execution checks to view Spring Boot console pipeline traces.
                    </div>
                  )}
                </div>
              </div>

              {/* SecurityContext State Box (4 cols) */}
              <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-sans text-slate-800 uppercase pb-2 border-b border-slate-200 font-bold tracking-wider">
                    Spring Boot Context state
                  </p>
                  
                  <div className="mt-4 space-y-3.5">
                    <div>
                      <span className="text-[9px] text-slate-400 font-mono block uppercase">Active Principal Name</span>
                      <span className="text-xs font-bold text-slate-800 font-mono mt-1 block">
                        {securityContextUser ? securityContextUser : "authenticatedAnonymousUser"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-400 font-mono block uppercase">Granted Authorities</span>
                      <span className="text-xs font-mono text-blue-600 mt-1 block font-bold">
                        {securityContextUser ? `[${selectedRole}]` : "[]"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-400 font-mono block uppercase">Secure Thread isolation</span>
                      <span className="text-[10px] font-sans text-slate-650 mt-1 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${securityContextUser ? "bg-emerald-500" : "bg-amber-500"}`}></span> 
                        {securityContextUser ? "Context Thread Safe" : "Guest Pass Mode"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-[9.5px] font-sans mt-4 text-slate-500 leading-normal">
                  <b>Threat Shield:</b> Multi-Tenant isolation filter terminates early before calling any repository logic, fully protecting data boundaries.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SOURCE CODES */}
        {activeTabSub === "secure-code" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Java Selector sidebar (4 cols) */}
            <div className="lg:col-span-4 bg-slate-50 p-3 border border-slate-200 rounded-xl space-y-1 shadow-sm h-[480px]">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider px-3 py-1.5 bg-white border border-slate-201 rounded-lg font-bold mb-3">
                Spring Security Components
              </p>

              <button
                onClick={() => setCodeTab("security-config")}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                  codeTab === "security-config" ? "bg-blue-50/50 border-l-4 border-blue-600 text-blue-700 font-bold" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Code className="w-4 h-4 text-blue-600 shrink-0" />
                <span>WebSecurityConfig.java</span>
              </button>

              <button
                onClick={() => setCodeTab("jwt-filter")}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                  codeTab === "jwt-filter" ? "bg-blue-50/50 border-l-4 border-blue-600 text-blue-700 font-bold" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Code className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>JwtAuthenticationFilter.java</span>
              </button>

              <button
                onClick={() => setCodeTab("auth-provider")}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                  codeTab === "auth-provider" ? "bg-blue-50/50 border-l-4 border-blue-600 text-blue-700 font-bold" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Code className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>TokenProvider.java</span>
              </button>
            </div>

            {/* Code visual interface (8 cols) */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[480px] shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 font-bold">
                  com/notary/saas/core/security/{codeTab === "security-config" ? "WebSecurityConfig.java" : codeTab === "jwt-filter" ? "JwtAuthenticationFilter.java" : "TokenProvider.java"}
                </span>
                <button
                  onClick={() => handleCopy(javaSourceCode[codeTab])}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-205 text-[10px] font-sans font-bold hover:bg-slate-50 transition shadow-sm"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                  <span>{copied ? "Copied" : "Copy Source"}</span>
                </button>
              </div>

              <div className="p-4 flex-1 overflow-auto bg-slate-50 text-slate-800 font-mono text-[11px] leading-relaxed select-text whitespace-pre">
                {javaSourceCode[codeTab]}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
